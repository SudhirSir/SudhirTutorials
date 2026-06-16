import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { messageEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const group = await withDbRetry(() => prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    }));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify current user is a member
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error('[Groups Settings GET] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, action, targetUserId, userIds, isAdmin } = body;

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const currentUserId = session.user.id;

    // Check membership and admin status of the caller
    const callerMember = await withDbRetry(() => prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: currentUserId } },
    }));

    if (!callerMember && action !== 'LEAVE_GROUP') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get group with members to compute notifications/SSE payloads
    const group = await withDbRetry(() => prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    }));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const memberIdsBefore = group.members.map((m) => m.userId);

    // Validate admin actions
    if (action !== 'LEAVE_GROUP' && !callerMember?.isAdmin) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    if (action === 'ADD_MEMBERS') {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: 'userIds array is required' }, { status: 400 });
      }

      // Filter out existing members
      const newIds = userIds.filter((id) => !memberIdsBefore.includes(id));
      if (newIds.length === 0) {
        return NextResponse.json({ error: 'All selected users are already members of this group.' }, { status: 400 });
      }

      await withDbRetry(() => prisma.$transaction(async (tx) => {
        await tx.groupMember.createMany({
          data: newIds.map((userId) => ({
            groupId,
            userId,
            isAdmin: false,
          })),
        });

        // Fetch user names for system message
        const addedUsers = await tx.user.findMany({
          where: { id: { in: newIds } },
          select: { name: true },
        });
        const names = addedUsers.map((u) => u.name || 'Unknown User').join(', ');

        const sysMsg = await tx.message.create({
          data: {
            senderId: currentUserId,
            groupId,
            content: `📢 ${names} added to the group.`,
          },
          include: {
            sender: {
              select: { id: true, name: true, username: true, role: true, photoUrl: true },
            },
          },
        });

        // Emit message to all members (including new ones)
        const updatedMembers = [...memberIdsBefore, ...newIds];
        messageEmitter.emit('message', {
          type: 'create',
          message: {
            ...sysMsg,
            group: { id: group.id, name: group.name, photoUrl: group.photoUrl },
          },
          senderId: currentUserId,
          groupId,
          memberIds: updatedMembers,
        });
      }));

      return NextResponse.json({ success: true });
    }

    if (action === 'SET_ADMIN') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }

      await withDbRetry(() => prisma.$transaction(async (tx) => {
        await tx.groupMember.update({
          where: { groupId_userId: { groupId, userId: targetUserId } },
          data: { isAdmin: !!isAdmin },
        });

        const targetUser = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { name: true },
        });

        const sysMsg = await tx.message.create({
          data: {
            senderId: currentUserId,
            groupId,
            content: `📢 ${targetUser?.name || 'User'} is now ${!!isAdmin ? 'an Admin' : 'a Member'}.`,
          },
          include: {
            sender: {
              select: { id: true, name: true, username: true, role: true, photoUrl: true },
            },
          },
        });

        messageEmitter.emit('message', {
          type: 'create',
          message: {
            ...sysMsg,
            group: { id: group.id, name: group.name, photoUrl: group.photoUrl },
          },
          senderId: currentUserId,
          groupId,
          memberIds: memberIdsBefore,
        });
      }));

      return NextResponse.json({ success: true });
    }

    if (action === 'REMOVE_MEMBER' || action === 'LEAVE_GROUP') {
      const targetId = action === 'LEAVE_GROUP' ? currentUserId : targetUserId;

      if (!targetId) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }

      // Check if trying to remove the group creator (creator shouldn't be removable unless group deleted)
      if (targetId === group.createdById && action === 'REMOVE_MEMBER') {
        return NextResponse.json({ error: 'Group creator cannot be removed.' }, { status: 400 });
      }

      await withDbRetry(() => prisma.$transaction(async (tx) => {
        await tx.groupMember.delete({
          where: { groupId_userId: { groupId, userId: targetId } },
        });

        const targetUser = await tx.user.findUnique({
          where: { id: targetId },
          select: { name: true },
        });

        const sysMsg = await tx.message.create({
          data: {
            senderId: currentUserId,
            groupId,
            content: `📢 ${targetUser?.name || 'User'} ${action === 'LEAVE_GROUP' ? 'left' : 'was removed from'} the group.`,
          },
          include: {
            sender: {
              select: { id: true, name: true, username: true, role: true, photoUrl: true },
            },
          },
        });

        // Notify remaining members
        const remainingMemberIds = memberIdsBefore.filter((id) => id !== targetId);

        messageEmitter.emit('message', {
          type: 'create',
          message: {
            ...sysMsg,
            group: { id: group.id, name: group.name, photoUrl: group.photoUrl },
          },
          senderId: currentUserId,
          groupId,
          memberIds: remainingMemberIds,
        });

        // Emit deleteChat to the removed member so their UI clears the group
        messageEmitter.emit('message', {
          type: 'deleteChat',
          chatGroupId: groupId,
          deletedByUserId: targetId, // Trigger self deletion on target user client
          groupId,
          memberIds: [targetId],
        });
      }));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Groups Settings PATCH] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const currentUserId = session.user.id;

    // Verify the group exists and caller is admin
    const group = await withDbRetry(() => prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    }));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const callerMember = group.members.find((m) => m.userId === currentUserId);
    if (!callerMember || (!callerMember.isAdmin && group.createdById !== currentUserId)) {
      return NextResponse.json({ error: 'Admin permission required to delete the group.' }, { status: 403 });
    }

    const allMemberIds = group.members.map((m) => m.userId);

    // Delete the group
    await withDbRetry(() => prisma.chatGroup.delete({
      where: { id: groupId },
    }));

    // Emit deleteChat event to all members
    messageEmitter.emit('message', {
      type: 'deleteChat',
      chatGroupId: groupId,
      deletedByUserId: currentUserId,
      groupId,
      memberIds: allMemberIds,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Groups Settings DELETE] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
