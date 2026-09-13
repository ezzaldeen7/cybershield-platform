import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { getDb } from "./db";
import { quizzes, quizQuestions } from "../drizzle/schema";
import { gt } from "drizzle-orm";
import { OFFICIAL_QUIZ_IDS } from "./services/quizService";

describe("Quiz Management Backend & Ownership / IDOR Authorization Suite", () => {
  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(quizQuestions).where(gt(quizQuestions.quizId, 7));
      await db.delete(quizzes).where(gt(quizzes.id, 7));
    }
  });

  function createTestContext(user: User | null): { ctx: TrpcContext } {
    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: { "user-agent": "Vitest-Test-Runner" },
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };
    return { ctx };
  }

  const regularUser: User = {
    id: 101,
    openId: "student-101",
    email: "student@cybershield.sa",
    passwordHash: "hash123",
    name: "Regular Student",
    loginMethod: "local",
    role: "user",
    isActive: true,
    lastIpAddress: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const instructorA: User = {
    ...regularUser,
    id: 102,
    openId: "instructor-102",
    email: "instructor_a@cybershield.sa",
    name: "Dr. Instructor A",
    role: "instructor",
  };

  const instructorB: User = {
    ...regularUser,
    id: 104,
    openId: "instructor-104",
    email: "instructor_b@cybershield.sa",
    name: "Dr. Instructor B",
    role: "instructor",
  };

  const adminUser: User = {
    ...regularUser,
    id: 103,
    openId: "admin-103",
    email: "admin@cybershield.sa",
    name: "Platform Admin",
    role: "admin",
  };

  it("1. allows Instructor A to create a new quiz starting as draft", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const created = await callerA.quiz.create({
      titleAr: "اختبار معمارية انعدام الثقة",
      titleEn: "Zero Trust Quiz",
      passScorePercentage: 75,
      status: "draft",
    });

    expect(created).toBeDefined();
    expect(created.id).toBeGreaterThan(7);
    expect(created.createdBy).toBe(instructorA.id);
    expect(created.status).toBe("draft");
    expect(created.passScorePercentage).toBe(75);
  });

  it("2. allows Instructor A to add multiple-choice questions with options and explanations", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quiz = await callerA.quiz.create({
      titleAr: "اختبار إدارة كلمات المرور السحابية",
      status: "draft",
    });

    const question = await callerA.quiz.addQuestion({
      quizId: quiz.id,
      questionAr: "ما هو الشرط الأساسي لتأمين بيئة الحوسبة السحابية؟",
      questionEn: "What is the primary condition for securing cloud environments?",
      options: [
        "إلغاء المصادقة الثنائية",
        "تطبيق مبدأ الامتيازات الأقل Least Privilege",
        "مشاركة بيانات الدخول مع الفريق",
        "استخدام كلمات مرور قصيرة",
      ],
      correctOptionIndex: 1,
      explanationAr: "مبدأ الامتيازات الأقل يمنح المستخدم الحد الأدنى فقط من الوصول المطلوب لأداء عمله.",
      difficulty: "medium",
      order: 1,
    });

    expect(question).toBeDefined();
    expect(question.quizId).toBe(quiz.id);
    expect(question.correctOptionIndex).toBe(1);

    const manage = await callerA.quiz.getManageQuiz({ quizId: quiz.id });
    expect(manage.questions.length).toBe(1);
    expect(manage.questions[0].options.length).toBe(4);
    expect(manage.questions[0].correctOptionIndex).toBe(1);
  });

  it("3. allows Instructor A to update and archive their own quiz and questions", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quiz = await callerA.quiz.create({
      titleAr: "اختبار تجريبي للمالك",
      status: "draft",
    });

    const q = await callerA.quiz.addQuestion({
      quizId: quiz.id,
      questionAr: "سؤال اختباري قابل للتعديل",
      options: ["أ", "ب"],
      correctOptionIndex: 0,
      explanationAr: "تفسير أولي",
    });

    // Update question
    const updatedQ = await callerA.quiz.updateQuestion({
      questionId: q.id,
      questionAr: "سؤال اختباري بعد التحديث",
      correctOptionIndex: 1,
    });
    expect(updatedQ.questionAr).toBe("سؤال اختباري بعد التحديث");

    // Update quiz
    const updatedQuiz = await callerA.quiz.update({
      id: quiz.id,
      titleAr: "اختبار تجريبي محدث للمالك",
      status: "published",
    });
    expect(updatedQuiz.titleAr).toBe("اختبار تجريبي محدث للمالك");
    expect(updatedQuiz.status).toBe("published");

    // Archive quiz
    const archived = await callerA.quiz.archive({ id: quiz.id });
    expect(archived.success).toBe(true);

    // Delete question
    const deletedQ = await callerA.quiz.deleteQuestion({ questionId: q.id });
    expect(deletedQ.success).toBe(true);
  });

  it("4. strictly blocks Instructor B from updating Quiz A created by Instructor A (IDOR Prevention)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quizA = await callerA.quiz.create({
      titleAr: "اختبار خاص بالدكتور أ",
      status: "draft",
    });

    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    await expect(
      callerB.quiz.update({
        id: quizA.id,
        titleAr: "محاولة اختراق الاختبار من دكتور ب",
      })
    ).rejects.toThrowError(/غير مصرح لك بتعديل هذا الاختبار/i);
  });

  it("5. strictly blocks Instructor B from archiving or deleting Quiz A (IDOR Prevention)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quizA = await callerA.quiz.create({
      titleAr: "اختبار أ المحمي من الحذف",
      status: "draft",
    });

    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    await expect(
      callerB.quiz.archive({ id: quizA.id })
    ).rejects.toThrowError(/غير مصرح لك بأرشفة هذا الاختبار/i);

    await expect(
      callerB.quiz.delete({ id: quizA.id })
    ).rejects.toThrowError(/غير مصرح لك بأرشفة هذا الاختبار/i);
  });

  it("6. strictly blocks Instructor B from adding, updating, or deleting questions on Quiz A (IDOR Prevention)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quizA = await callerA.quiz.create({
      titleAr: "اختبار أ للأسئلة المحمية",
      status: "draft",
    });

    const questionA = await callerA.quiz.addQuestion({
      quizId: quizA.id,
      questionAr: "سؤال أصلي للدكتور أ",
      options: ["نعم", "لا"],
      correctOptionIndex: 0,
      explanationAr: "تفسير أصلي",
    });

    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    // Instructor B attempts to add question to Quiz A
    await expect(
      callerB.quiz.addQuestion({
        quizId: quizA.id,
        questionAr: "سؤال متسلل من دكتور ب",
        options: ["1", "2"],
        correctOptionIndex: 0,
        explanationAr: "تفسير متسلل",
      })
    ).rejects.toThrowError(/غير مصرح لك بإضافة أسئلة لهذا الاختبار/i);

    // Instructor B attempts to update question in Quiz A
    await expect(
      callerB.quiz.updateQuestion({
        questionId: questionA.id,
        questionAr: "تعديل غير مصرح به",
      })
    ).rejects.toThrowError(/غير مصرح لك بتعديل أسئلة هذا الاختبار/i);

    // Instructor B attempts to delete question in Quiz A
    await expect(
      callerB.quiz.deleteQuestion({
        questionId: questionA.id,
      })
    ).rejects.toThrowError(/غير مصرح لك بحذف أسئلة هذا الاختبار/i);
  });

  it("7. strictly blocks instructors from modifying or deleting official quizzes (IDs 1..7)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    for (const officialQuizId of OFFICIAL_QUIZ_IDS) {
      await expect(
        callerA.quiz.update({
          id: officialQuizId,
          titleAr: "محاولة تغيير عنوان الاختبار الرسمي",
        })
      ).rejects.toThrowError(/لا يمكن للمدرس تعديل الاختبارات الرسمية المعتمدة/i);

      await expect(
        callerA.quiz.archive({ id: officialQuizId })
      ).rejects.toThrowError(/لا يمكن للمدرس أرشفة أو حذف الاختبارات الرسمية المعتمدة/i);

      await expect(
        callerA.quiz.addQuestion({
          quizId: officialQuizId,
          questionAr: "سؤال غير رسمي",
          options: ["أ", "ب"],
          correctOptionIndex: 0,
          explanationAr: "تفسير تعليمي مفصل",
        })
      ).rejects.toThrowError(/لا يمكن للمدرس إضافة أسئلة للاختبارات الرسمية المعتمدة/i);
    }
  });

  it("8. prevents regular learners from taking or seeing a draft quiz", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const draftQuiz = await callerA.quiz.create({
      titleAr: "اختبار مسودة غير منشور",
      status: "draft",
    });

    const { ctx: ctxStudent } = createTestContext(regularUser);
    const callerStudent = appRouter.createCaller(ctxStudent);

    // Student cannot fetch questions for draft quiz
    await expect(
      callerStudent.quiz.getQuestions({ quizId: draftQuiz.id })
    ).rejects.toThrowError(/الاختبار غير متاح حالياً؛ ما زال قيد الإعداد أو تمت أرشفته/i);

    // Student cannot submit answers for draft quiz
    await expect(
      callerStudent.quiz.submit({
        quizId: draftQuiz.id,
        answers: [],
      })
    ).rejects.toThrowError(/الاختبار غير متاح حالياً؛ ما زال قيد الإعداد أو تمت أرشفته/i);
  });

  it("9. strictly blocks regular user and guest from quiz management APIs (FORBIDDEN 403)", async () => {
    const { ctx: ctxStudent } = createTestContext(regularUser);
    const callerStudent = appRouter.createCaller(ctxStudent);

    await expect(
      callerStudent.quiz.create({ titleAr: "اختبار من طالب" })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      callerStudent.quiz.list()
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    const { ctx: ctxGuest } = createTestContext(null);
    const callerGuest = appRouter.createCaller(ctxGuest);

    await expect(
      callerGuest.quiz.create({ titleAr: "اختبار من زائر" })
    ).rejects.toThrowError(/Instructor or Admin access required/i);
  });

  it("10. allows Admin to manage all quizzes and questions", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const quiz = await callerA.quiz.create({
      titleAr: "اختبار للمراجعة الإدارية",
      status: "draft",
    });

    const { ctx: ctxAdmin } = createTestContext(adminUser);
    const callerAdmin = appRouter.createCaller(ctxAdmin);

    // Admin can update
    const updated = await callerAdmin.quiz.update({
      id: quiz.id,
      titleAr: "اختبار معتمد من المشرف",
      status: "published",
    });
    expect(updated.titleAr).toBe("اختبار معتمد من المشرف");
    expect(updated.status).toBe("published");

    // Admin can add question
    const q = await callerAdmin.quiz.addQuestion({
      quizId: quiz.id,
      questionAr: "سؤال مضاف بواسطة الأدمن",
      options: ["صواب", "خطأ"],
      correctOptionIndex: 0,
      explanationAr: "توضيح الأدمن",
    });
    expect(q.id).toBeGreaterThan(0);

    // Admin can archive
    const archived = await callerAdmin.quiz.archive({ id: quiz.id });
    expect(archived.success).toBe(true);
  });
});
