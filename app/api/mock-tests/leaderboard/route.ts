export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

function getMatchingClassNames(rawClass: string | null | undefined): string[] {
  if (!rawClass) return [];
  const cls = rawClass.toString().trim();
  if (/12/i.test(cls)) {
    return ['12th', '12th (Sci)', '12th Sci', '12th (Com)', '12th Com', '12th Commerce', '12th (Comm)', 'Class 12', 'Class 12th', '12'];
  }
  if (/11/i.test(cls)) {
    return ['11th', '11th (Sci)', '11th Sci', '11th (Com)', '11th Com', '11th Commerce', '11th (Comm)', 'Class 11', 'Class 11th', '11'];
  }
  if (/10/i.test(cls)) {
    return ['10th', 'Class 10', 'Class 10th', '10'];
  }
  if (/9/i.test(cls) || /IX/i.test(cls)) {
    return ['9th', 'Class 9', 'Class 9th', '9', 'CBSE Class IX'];
  }
  if (/8/i.test(cls)) {
    return ['8th', 'Class 8', 'Class 8th', '8'];
  }
  if (/7/i.test(cls)) {
    return ['7th', 'Class 7', 'Class 7th', '7'];
  }
  if (/6/i.test(cls)) {
    return ['6th', 'Class 6', 'Class 6th', '6'];
  }
  return [cls];
}

function getMatchingBoards(rawBoard: string | null | undefined): string[] {
  const list = ['All Boards', 'ALL', 'All'];
  if (!rawBoard) return list;
  const b = rawBoard.toString().trim();
  list.push(b);
  if (/CBSE/i.test(b)) {
    list.push('CBSE', 'CBSE Board');
  }
  if (/ICSE/i.test(b)) {
    list.push('ICSE', 'ICSE Board');
  }
  if (/UP/i.test(b)) {
    list.push('UP Board', 'UP');
  }
  return Array.from(new Set(list));
}


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
      const userProfile = await appCache.getOrSet(`student-profile:${session.user.id}`, () => {
        return withDbRetry(() => prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
          select: { className: true, board: true }
        }));
      }, 120);

      if (userProfile?.className) studentClass = userProfile.className;
      if (userProfile?.board) studentBoard = userProfile.board;
    }

    if (scope === 'test' && mockTestId) {
      // PER-MOCK TEST LEADERBOARD (Singleflight cached for 20s to prevent query spikes)
      const cacheKey = `leaderboard:test:${mockTestId}`;
      const cachedResult = await appCache.getOrSet(cacheKey, async () => {
        const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
          where: { id: mockTestId },
          select: { id: true, title: true, chapterName: true, subject: true, className: true, board: true, totalMarks: true, passingMarks: true }
        }));

        if (!mockTest) {
          return { error: 'Mock test not found', status: 404 };
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

        // Track highest score (best attempt) achieved per student
        const bestAttemptsMap = new Map<string, any>();
        for (const sub of allSubmissions) {
          const existing = bestAttemptsMap.get(sub.studentId);
          if (!existing || sub.score > existing.score || (sub.score === existing.score && sub.timeTaken < existing.timeTaken)) {
            bestAttemptsMap.set(sub.studentId, sub);
          }
        }

        const leaderboardList = Array.from(bestAttemptsMap.values());

        // Strictly rank students based on marks achieved in descending order:
        // 1. Score (descending - highest marks achieved = Rank 1)
        // 2. Time taken (ascending - faster completion is tie-breaker)
        // 3. Submission date (ascending - earlier attempt is tie-breaker)
        leaderboardList.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const rankedEntries = leaderboardList.map((entry, index) => {
          const completedAt = entry.completedAt || entry.createdAt;
          const startedAt = entry.startedAt || new Date(new Date(completedAt).getTime() - (entry.timeTaken || 0) * 1000);
          const studentName = entry.student?.name?.trim() || entry.student?.username || 'Student';
          const rollNo = entry.student?.studentProfile?.rollNumber;
          const username = entry.student?.username || '';
          const displayId = rollNo || username || entry.studentId;
          const boardVal = entry.student?.studentProfile?.board;
          const cleanBoard = (boardVal && boardVal !== 'N/A' && boardVal !== 'All Boards') ? boardVal : (mockTest.board !== 'All Boards' ? mockTest.board : null);

          return {
            rank: index + 1,
            studentId: entry.studentId,
            studentName,
            username,
            rollNumber: rollNo || username,
            displayId,
            photoUrl: entry.student?.photoUrl || entry.student?.studentProfile?.photoUrl || null,
            className: entry.student?.studentProfile?.className || mockTest.className,
            board: cleanBoard,
            score: entry.score,
            totalMarks: mockTest.totalMarks,
            passingMarks: mockTest.passingMarks || 4,
            isPassed: entry.score >= (mockTest.passingMarks || 4),
            timeTaken: entry.timeTaken,
            startedAt,
            completedAt,
            submittedAt: completedAt
          };
        });

        return {
          scope: 'test',
          mockTest,
          leaderboard: rankedEntries,
          success: true
        };
      }, 20);

      if ((cachedResult as any).error) {
        return NextResponse.json({ error: (cachedResult as any).error }, { status: (cachedResult as any).status || 404 });
      }

      return NextResponse.json(cachedResult);
    }

    // OVERALL CLASS / BATCH LEADERBOARD (ACROSS ALL MOCK TESTS)
    const cacheKey = `leaderboard:overall:${studentClass || 'ALL'}:${studentBoard || 'ALL'}`;
    const overallResult = await appCache.getOrSet(cacheKey, async () => {
      const testWhere: any = { isPublished: true, isStoreItem: false };
      if (studentClass && studentClass !== 'ALL') {
        const matchingCls = getMatchingClassNames(studentClass);
        if (matchingCls.length > 0) {
          testWhere.className = { in: matchingCls };
        } else {
          testWhere.className = studentClass;
        }
      }
      if (studentBoard && studentBoard !== 'ALL' && studentBoard !== 'All Boards') {
        const matchingBds = getMatchingBoards(studentBoard);
        if (matchingBds.length > 0) {
          testWhere.board = { in: matchingBds };
        }
      }

      const matchingTests = await withDbRetry(() => prisma.chapterMockTest.findMany({
        where: testWhere,
        select: { id: true, totalMarks: true, passingMarks: true }
      }));

      // Index test passing marks in O(1) Map
      const testPassingMarksMap = new Map<string, number>();
      for (const t of matchingTests) {
        testPassingMarksMap.set(t.id, t.passingMarks || 4);
      }

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

      // Group by student & mockTestId -> keep HIGHEST SCORE attempt per student
      const studentTestMap = new Map<string, Map<string, any>>();

      for (const sub of allSubmissions) {
        if (!studentTestMap.has(sub.studentId)) {
          studentTestMap.set(sub.studentId, new Map());
        }
        const testMap = studentTestMap.get(sub.studentId)!;
        const existing = testMap.get(sub.mockTestId);
        if (!existing || sub.score > existing.score || (sub.score === existing.score && sub.timeTaken < existing.timeTaken)) {
          testMap.set(sub.mockTestId, sub);
        }
      }

      // Compute aggregate metrics per student using O(1) test lookup
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
          const passLimit = testPassingMarksMap.get(sub.mockTestId) || 4;
          if (sub.score >= passLimit) testsPassed += 1;
        });

        if (firstSub) {
          const studentName = firstSub.student?.name?.trim() || firstSub.student?.username || 'Student';
          const rollNo = firstSub.student?.studentProfile?.rollNumber;
          const username = firstSub.student?.username || '';
          const displayId = rollNo || username || studentId;
          const boardVal = firstSub.student?.studentProfile?.board;
          const cleanBoard = (boardVal && boardVal !== 'N/A' && boardVal !== 'All Boards') ? boardVal : (studentBoard && studentBoard !== 'ALL' && studentBoard !== 'All Boards' ? studentBoard : null);

          aggregateList.push({
            studentId,
            studentName,
            username,
            rollNumber: rollNo || username,
            displayId,
            photoUrl: firstSub.student?.photoUrl || firstSub.student?.studentProfile?.photoUrl || null,
            className: firstSub.student?.studentProfile?.className || studentClass || 'N/A',
            board: cleanBoard,
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

      return {
        scope: 'overall',
        targetClass: studentClass || 'All Classes',
        targetBoard: studentBoard || 'All Boards',
        leaderboard: rankedOverall,
        success: true
      };
    }, 20);

    return NextResponse.json(overallResult);

  } catch (error) {
    console.error('Error generating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to generate leaderboard' }, { status: 500 });
  }
}
