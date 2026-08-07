import { prisma } from "@/lib/prisma";

export interface AnswerSubmission {
  questionId: string;
  selectedOption: string | number;
}

export async function evaluateTestSubmission(
  studentId: string,
  onlineTestId: string,
  answers: AnswerSubmission[],
  timeTaken: number = 0,
  autoSubmitted: boolean = false
) {
  const test = await prisma.onlineTest.findUnique({
    where: { id: onlineTestId },
    include: { questions: true }
  });

  if (!test) {
    throw new Error("TEST_NOT_FOUND");
  }

  let totalScore = 0;
  const evaluatedAnswers = test.questions.map((q) => {
    const userAns = answers.find((a) => a.questionId === q.id);
    const isCorrect = userAns
      ? String(userAns.selectedOption) === String(q.correctOption)
      : false;
    if (isCorrect) {
      totalScore += q.marks;
    }

    return {
      questionId: q.id,
      selectedOption: userAns ? userAns.selectedOption : null,
      isCorrect,
      marksObtained: isCorrect ? q.marks : 0
    };
  });

  const submission = await prisma.onlineTestSubmission.upsert({
    where: {
      onlineTestId_studentId: {
        onlineTestId,
        studentId
      }
    },
    update: {
      score: totalScore,
      timeTaken,
      autoSubmitted
    },
    create: {
      onlineTestId,
      studentId,
      score: totalScore,
      timeTaken,
      autoSubmitted
    }
  });

  return { submission, totalScore, totalMarks: test.totalMarks, evaluatedAnswers };
}
