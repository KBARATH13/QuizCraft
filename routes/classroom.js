const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const Quiz = require('../models/quiz'); // Import Quiz model
const QuizAttempt = require('../models/QuizAttempt'); // Import QuizAttempt model
const authMiddleware = require('../middleware/authMiddleware');
const { nanoid } = require('nanoid');

// @route   POST /api/classrooms/create
// @desc    Create a new classroom
// @access  Private (Teachers only)
router.post('/create', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can create classrooms.' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Please provide a classroom name.' });
  }

  try {
    const newClassroom = new Classroom({
      name,
      teacher: req.user.id,
      classCode: nanoid(8), // Generate a unique 8-character code
    });

    const classroom = await newClassroom.save();

    // Add classroom to teacher's list of classrooms
    await User.findByIdAndUpdate(req.user.id, { $push: { classrooms: classroom._id } });

    res.status(201).json(classroom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classrooms/teacher
// @desc    Get all classrooms for the logged-in teacher
// @access  Private (Teachers only)
router.get('/teacher', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'You are not authorized to view these classrooms.' });
  }

  try {
    const classrooms = await Classroom.find({ teacher: req.user.id })
      .populate('students', 'username email profilePicture')
      .populate('quizzes.quiz', 'title topic _id'); // Populate quizzes
    res.json(classrooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classrooms/student
// @desc    Get all classrooms for the logged-in student
// @access  Private (Students only)
router.get('/student', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'You are not authorized to view these classrooms.' });
  }

  try {
    const classrooms = await Classroom.find({ students: req.user.id })
      .populate('teacher', 'username')
      .populate('quizzes.quiz', 'title topic');
    res.json(classrooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classrooms/:id
// @desc    Get a single classroom by ID
// @access  Private (Students in the classroom or the Teacher)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('teacher', 'username')
      .populate('quizzes.quiz');

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    const isTeacher = classroom.teacher._id.toString() === req.user.id;
    const isStudent = classroom.students.map(s => s.toString()).includes(req.user.id);

    if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: 'You are not authorized to view this classroom.' });
    }

    res.json(classroom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classrooms/:classroomId/assign-quiz
// @desc    Assign quizzes to a classroom
// @access  Private (Teachers only)
router.post('/:classroomId/assign-quiz', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can assign quizzes.' });
  }

  const { quizIds, quizTakingStyle } = req.body; // Expect an array of quiz IDs and a quizTakingStyle object
  const { classroomId } = req.params;

  if (!Array.isArray(quizIds)) {
    return res.status(400).json({ message: 'quizIds must be an array.' });
  }

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to assign quizzes to this classroom.' });
    }

    const assignedQuizzes = [];
    const notFoundQuizzes = [];
    const alreadyAssignedQuizzes = [];

    for (const quizId of quizIds) {
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        notFoundQuizzes.push(quizId);
        continue;
      }

      if (classroom.quizzes.some(q => q.quiz && q.quiz.toString() === quizId)) {
        alreadyAssignedQuizzes.push(quizId);
        continue;
      }

      classroom.quizzes.push({ quiz: quizId, quizTakingStyle });
      assignedQuizzes.push(quizId);
    }

    await classroom.save();

    let message = 'Quiz assignment process completed.';
    if (assignedQuizzes.length > 0) {
      message += ` Successfully assigned ${assignedQuizzes.length} quiz(es).`;
    }
    if (alreadyAssignedQuizzes.length > 0) {
      message += ` ${alreadyAssignedQuizzes.length} quiz(es) were already assigned.`;
    }
    if (notFoundQuizzes.length > 0) {
      message += ` ${notFoundQuizzes.length} quiz(es) not found.`;
    }

    res.json({ message, classroom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classrooms/:classroomId/unassign-quiz
// @desc    Unassign a quiz from a classroom
// @access  Private (Teachers only)
router.post('/:classroomId/unassign-quiz', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can unassign quizzes.' });
  }

  const { quizId } = req.body;
  const { classroomId } = req.params;

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to unassign quizzes from this classroom.' });
    }
    
    const originalQuizCount = classroom.quizzes.length;

    const result = await Classroom.findByIdAndUpdate(
      classroomId,
      { $pull: { quizzes: { quiz: quizId } } },
      { new: true }
    ).populate('quizzes.quiz', 'title topic _id');

    if (!result) {
        // This case should ideally not be hit if the classroom check above passes
        return res.status(404).json({ message: 'Classroom not found.' });
    }
    
    // Check if a quiz was actually removed
    if (result.quizzes.length === originalQuizCount) {
        return res.status(400).json({ message: 'Quiz is not assigned to this classroom or could not be removed.' });
    }

    res.json({ message: 'Quiz unassigned successfully!', classroom: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/classrooms/:id
// @desc    Delete a classroom
// @access  Private (Teachers only)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can delete classrooms.' });
  }

  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this classroom.' });
    }

    // Remove classroom from all enrolled students' classroom lists
    await User.updateMany(
      { classrooms: classroom._id },
      { $pull: { classrooms: classroom._id } }
    );

    // Delete quiz attempts related to quizzes assigned to this classroom
    // This is a more complex operation and might require iterating through quizzes
    // For simplicity, we'll assume deleting the classroom is sufficient for now.
    // If specific quiz attempts need to be cleaned up, a more detailed query would be needed.

    await classroom.deleteOne();

    res.json({ message: 'Classroom deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classrooms/:classroomId/quiz-performance
// @desc    Get quiz performance for students in a specific classroom
// @access  Private (Teachers only)
router.get('/:classroomId/quiz-performance', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'You are not authorized to view this data.' });
  }

  try {
    const classroom = await Classroom.findById(req.params.classroomId)
      .populate('students', 'username email profilePicture')
      .populate({
        path: 'quizzes.quiz',
        model: 'Quiz',
        select: 'title'
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this classroom' });
    }

    const studentPerformance = [];

    for (const student of classroom.students) {
      const quizzesTaken = [];
      for (const quizObj of classroom.quizzes) {
        if (quizObj.quiz) { // Check if quiz is not null
          const quizAttempt = await QuizAttempt.findOne({
            user: student._id,
            quiz: quizObj.quiz._id,
          }).select('score totalQuestions');

          quizzesTaken.push({
            quizId: quizObj.quiz._id,
            quizTitle: quizObj.quiz.title,
            score: quizAttempt ? quizAttempt.score : 'N/A',
            totalQuestions: quizAttempt ? quizAttempt.totalQuestions : 'N/A',
          });
        }
      }
      studentPerformance.push({
        studentId: student._id,
        username: student.username,
        email: student.email,
        quizzes: quizzesTaken,
      });
    }

    res.json(studentPerformance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classrooms/:id/add-student
// @desc    Add a student to a classroom
// @access  Private (Teachers only)
router.post('/:id/add-student', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can manage classrooms.' });
  }

  const { studentEmail } = req.body;
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to add students to this classroom.' });
    }

    const student = await User.findOne({ email: studentEmail });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (classroom.students.includes(student._id)) {
      return res.status(400).json({ message: 'Student is already in this classroom.' });
    }

    classroom.students.push(student._id);
    await classroom.save();

    await User.findByIdAndUpdate(student._id, { $push: { classrooms: classroom._id } });

    res.json(classroom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/classrooms/:id/remove-student
// @desc    Remove a student from a classroom
// @access  Private (Teachers only)
router.delete('/:id/remove-student/:studentId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Only teachers can manage classrooms.' });
  }

  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (classroom.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to remove students from this classroom.' });
    }

    // Remove student from classroom
    await Classroom.findByIdAndUpdate(req.params.id, { $pull: { students: req.params.studentId } });

    // Remove classroom from student's list
    await User.findByIdAndUpdate(req.params.studentId, { $pull: { classrooms: req.params.id } });

    res.json({ message: 'Student removed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/classrooms/join
// @desc    Join a classroom using a class code
// @access  Private (Students only)
router.post('/join', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can join classrooms.' });
  }

  const { classCode } = req.body;
  try {
    const classroom = await Classroom.findOne({ classCode });
    if (!classroom) {
      return res.status(404).json({ message: 'Invalid class code.' });
    }

    if (classroom.students.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already in this classroom.' });
    }

    classroom.students.push(req.user.id);
    await classroom.save();

    await User.findByIdAndUpdate(req.user.id, { $push: { classrooms: classroom._id } });

    res.json(classroom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// @route   POST /api/classrooms/:id/leave
// @desc    Leave a classroom
// @access  Private (Students only)
router.post('/:id/leave', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can leave classrooms.' });
  }

  try {
    // Remove student from classroom
    await Classroom.findByIdAndUpdate(req.params.id, { $pull: { students: req.user.id } });

    // Remove classroom from student's list
    await User.findByIdAndUpdate(req.user.id, { $pull: { classrooms: req.params.id } });

    res.json({ message: 'You have left the classroom.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/classrooms/:id/leaderboard
// @desc    Get the leaderboard for a specific classroom
// @access  Private


router.get('/:classroomId/quiz/:quizId/style', authMiddleware, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    const quizData = classroom.quizzes.find(q => q.quiz && q.quiz.toString() === req.params.quizId);

    if (!quizData) {
      return res.status(404).json({ message: 'Quiz not found in this classroom.' });
    }

    res.json(quizData.quizTakingStyle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;