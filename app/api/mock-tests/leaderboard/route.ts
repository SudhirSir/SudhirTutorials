export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mockTestId = searchParams.get('mockTestId');
    const scope = searchParams.get('scope') || (mockTestId ? 'test' : 'overall');

    // Get student's class & board for overall scope filtering
    let studentClass = searchParams.get('className') || null;
    let studentBoard = searchParams.get('board') || null;

    if (session.user.role === 'STUDENT' && (!studentClass || !studentBoard)) {
      const userProfile = await withDbRetry(() => prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { className: true, board: true }
      }));
      if (userProfile?.className) studentClass = userProfile.className;
      if (userProfile?.board) studentBoard = userProfile.board;
    }

    if (scope === 'test' && mockTestId) {
      // PER-MOCK TEST LEADERBOARD
      const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
        where: { id: mockTestId },
        select: { id: true, title: true, chapterName: true, subject: true, className: true, board: true, totalMarks: true, passingMarks: true }
      }));

      if (!mockTest) {
        return NextResponse.json({ error: 'Mock test not found' }, { status: 404 });
      }

      // Fetch all submissions for this mock test ordered by earliest creation date (first attempt first)
      const allSubmissions = await withDbRetry(() => prisma.chapterMockSubmission.findMany({
        where: { mockTestId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              username: true,
              photoUrl: true,
              studentProfile: {
                select: { rollNumber: true, className: true, board: true, photoUrl: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }));

      // Filter FIRST ATTEMPT ONLY per student
      const firstAttemptsMap = new Map<string, any>();
      for (const sub of allSubmissions) {
        if (!firstAttemptsMap.has(sub.studentId)) {
          firstAttemptsMap.set(sub.studentId, sub);
        }
      }

      const leaderboardList = Array.from(firstAttemptsMap.values());

      // Rank students:
      // 1. Score (descending)
      // 2. Time taken (ascending - faster time gets better rank)
      // 3. Created date (ascending)
      leaderboardList.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const rankedEntries = leaderboardList.map((entry, index) => ({
        rank: index + 1,
        studentId: entry.studentId,
        studentName: entry.student?.name || entry.student?.username || 'Student',
        username: entry.student?.username || '',
        photoUrl: entry.student?.photoUrl || entry.student?.studentProfile?.photoUrl || null,
        className: entry.student?.studentProfile?.className || mockTest.className,
        board: entry.student?.studentProfile?.board || mockTest.board,
        score: entry.score,
        totalMarks: mockTest.totalMarks,
        passingMarks: mockTest.passingMarks || 4,
        isPassed: entry.score >= (mockTest.passingMarks || 4),
        timeTaken: entry.timeTaken,
        submittedAt: entry.createdAt
      }));

      return NextResponse.json({
        scope: 'test',
        mockTest,
        leaderboard: rankedEntries,
        success: true
      });
    }

    // OVERALL CLASS / BATCH LEADERBOARD (ACROSS ALL MOCK TESTS)
    const testWhere: any = { isPublished: true, isStoreItem: false };
    if (studentClass && studentClass !== 'ALL') {
      testWhere.className = studentClass;
    }

    const matchingTests = await withDbRetry(() => prisma.chapterMockTest.findMany({
      where: testWhere,
      select: { id: true, totalMarks: true, passingMarks: true }
    }));

    const testIds = matchingTests.map(t => t.id);

    // Fetch all submissions for these tests ordered by earliest creation date
    const allSubmissions = await withDbRetry(() => prisma.chapterMockSubmission.findMany({
      where: { mockTestId: { in: testIds } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
            studentProfile: {
              select: { rollNumber: true, className: true, board: true, photoUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    }));

    // Group by student & mockTestId -> keep FIRST ATTEMPT ONLY
    const studentTestMap = new Map<string, Map<string, any>>();

    for (const sub of allSubmissions) {
      if (!studentTestMap.has(sub.studentId)) {
        studentTestMap.set(sub.studentId, new Map());
      }
      const testMap = studentTestMap.get(sub.studentId)!;
      if (!testMap.has(sub.mockTestId)) {
        testMap.set(sub.mockTestId, sub);
      }
    }

    // Compute aggregate metrics per student
    const aggregateList: any[] = [];

    studentTestMap.forEach((testMap, studentId) => {
      let totalScore = 0;
      let totalTimeTaken = 0;
      let testsAttempted = 0;
      let testsPassed = 0;
      let firstSub: any = null;

      testMap.forEach((sub) => {
        if (!firstSub) firstSub = sub;
        totalScore += sub.score;
        totalTimeTaken += sub.timeTaken;
        testsAttempted += 1;
        if (sub.score >= 4) testsPassed += 1;
      });

      if (firstSub) {
        aggregateList.push({
          studentId,
          studentName: firstSub.student?.name || firstSub.student?.username || 'Student',
          username: firstSub.student?.username || '',
          photoUrl: firstSub.student?.photoUrl || firstSub.student?.studentProfile?.photoUrl || null,
          className: firstSub.student?.studentProfile?.className || studentClass || 'N/A',
          board: firstSub.student?.studentProfile?.board || studentBoard || 'N/A',
          totalScore,
          totalTimeTaken,
          testsAttempted,
          testsPassed
        });
      }
    });

    // Rank overall:
    // 1. Total Score (descending)
    // 2. Total Time Taken (ascending)
    aggregateList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalTimeTaken - b.totalTimeTaken;
    });

    const rankedOverall = aggregateList.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return NextResponse.json({
      scope: 'overall',
      targetClass: studentClass || 'All Classes',
      targetBoard: studentBoard || 'All Boards',
      leaderboard: rankedOverall,
      success: true
    });

  } catch (error) {
    console.error('Error generating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to generate leaderboard' }, { status: 500 });
  }
}
