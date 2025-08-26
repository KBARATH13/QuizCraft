const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Assuming authMiddleware exists
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User'); // To find users for private chats
const Classroom = require('../models/Classroom'); // Import Classroom model

// @route   GET /api/chat/rooms
// @desc    Get all chat rooms for the authenticated user
// @access  Private
router.get('/rooms', auth, async (req, res) => {
    try {
        const userId = req.user.id; // Assuming auth middleware adds user to req

        const chatRooms = await ChatRoom.find({ members: userId })
            .populate('members', 'username profilePicture') // Populate members' info
            .populate('lastMessage') // Populate last message for preview
            .sort({ updatedAt: -1 }); // Sort by most recent activity

        res.json(chatRooms);
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET /api/chat/room/:roomId/messages
// @desc    Get messages for a specific chat room
// @access  Private
router.get('/room/:roomId/messages', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const roomId = req.params.roomId;

        const chatRoom = await ChatRoom.findById(roomId);

        if (!chatRoom) {
            return res.status(404).json({ msg: 'Chat room not found' });
        }

        // Ensure user is a member of the chat room
        if (chatRoom.type !== 'global' && !chatRoom.members.includes(userId)) {
            return res.status(403).json({ msg: 'Not authorized to access this chat room' });
        }

        const messages = await ChatMessage.find({ chatRoom: roomId })
            .populate('sender', 'username profilePicture')
            .sort({ createdAt: 1 })
            .limit(100); // Limit messages for pagination

        res.json(messages);
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST /api/chat/private
// @desc    Create or get a private chat room with another user
// @access  Private
router.post('/private', auth, async (req, res) => {
    
    try {
        const userId1 = req.user.id;
        const { targetUserId } = req.body;
        

        const user1 = await User.findById(userId1);
        const user2 = await User.findById(targetUserId);

        if (!user1 || !user2) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const members = [userId1, targetUserId].sort();
        
        const sortedMembersHash = members.join('-');
        

        const { ObjectId } = require('mongoose').Types;
        const membersAsObjectIds = members.map(id => new ObjectId(id));
        

        let chatRoom = await ChatRoom.findOne({
            type: 'private',
            sortedMembersHash: sortedMembersHash,
        });
        

        if (chatRoom) {
            
            return res.json(chatRoom);
        }

        
        const newChatRoom = new ChatRoom({
            type: 'private',
            members: membersAsObjectIds,
            sortedMembersHash: sortedMembersHash,
        });

        await newChatRoom.save();

        const populatedRoom = await newChatRoom.populate('members', 'username profilePicture');
        res.status(201).json(populatedRoom);

    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET /api/chat/global
// @desc    Get or create the global chat room
// @access  Private
router.get('/global', auth, async (req, res) => {
    try {
        let globalChatRoom = await ChatRoom.findOne({ type: 'global' });

        if (!globalChatRoom) {
            // Create global chat room if it doesn't exist
            globalChatRoom = new ChatRoom({
                name: 'Global Chat',
                type: 'global',
                members: [], // Members are not explicitly stored for global chat, anyone can join
            });
            await globalChatRoom.save();
        }
        res.json(globalChatRoom);
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST /api/chat/classroom/:classroomId
// @desc    Get or create a classroom chat room
// @access  Private (Teacher only for creation, members for access)
router.post('/classroom/:classroomId', auth, async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user.id; // Teacher's ID

        // Verify user is a teacher and owns/manages this classroom
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ msg: 'Classroom not found' });
        }
        // Assuming 'User' model has 'role' and 'Classroom' has 'teacher' field
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if user is the teacher of the classroom OR a student in the classroom
        const isTeacher = classroom.teacher.toString() === userId;
        const isStudent = classroom.students.some(studentId => studentId.toString() === userId);

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ msg: 'Not authorized to access this classroom chat' });
        }

        if (isStudent) {
            let classroomChatRoom = await ChatRoom.findOne({ type: 'classroom', classroom: classroomId });

            if (!classroomChatRoom) {
                // Create new classroom chat room
                const members = [...classroom.students, classroom.teacher];
                classroomChatRoom = new ChatRoom({
                    name: `${classroom.name} Chat`,
                    type: 'classroom',
                    classroom: classroomId,
                    members: members,
                });
                await classroomChatRoom.save();
            }
            return res.status(200).json(classroomChatRoom);
        }

        // If it's a teacher, proceed with creation/management logic

        let classroomChatRoom = await ChatRoom.findOne({ type: 'classroom', classroom: classroomId });

        if (!classroomChatRoom) {
            // Create new classroom chat room
            // Members should include all current students and the teacher
            const members = [...classroom.students, classroom.teacher]; // Assuming students and teacher are ObjectIds
            classroomChatRoom = new ChatRoom({
                name: `${classroom.name} Chat`,
                type: 'classroom',
                classroom: classroomId,
                members: members,
            });
            await classroomChatRoom.save();
        } else {
            // If chat room exists, ensure all current students and teacher are members
            // This handles cases where students are added/removed after chat creation
            const currentClassroomMembers = [...classroom.students.map(s => s.toString()), classroom.teacher.toString()];
            const chatRoomMembers = classroomChatRoom.members.map(m => m.toString());

            const membersToAdd = currentClassroomMembers.filter(memberId => !chatRoomMembers.includes(memberId));
            const membersToRemove = chatRoomMembers.filter(memberId => !currentClassroomMembers.includes(memberId));

            if (membersToAdd.length > 0 || membersToRemove.length > 0) {
                classroomChatRoom.members = currentClassroomMembers;
                await classroomChatRoom.save();
            }
        }

        res.status(200).json(classroomChatRoom);
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});




router.post('/student-teacher', auth, async (req, res) => {
    try {
        const userId1 = req.user.id;
        const { targetUserId } = req.body;
        

        const user1 = await User.findById(userId1);
        const user2 = await User.findById(targetUserId);

        if (!user1 || !user2) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!((user1.role === 'student' && user2.role === 'teacher') || (user1.role === 'teacher' && user2.role === 'student'))) {
            return res.status(400).json({ msg: 'This route is only for student-teacher chats' });
        }

        const members = [userId1, targetUserId].sort();
        
        const sortedMembersHash = members.join('-');
        

        const { ObjectId } = require('mongoose').Types;
        const membersAsObjectIds = members.map(id => new ObjectId(id));
        

        let chatRoom = await ChatRoom.findOne({
            type: 'private',
            sortedMembersHash: sortedMembersHash,
        });
        

        if (chatRoom) {
            
            return res.json(chatRoom);
        }

        
        const newChatRoom = new ChatRoom({
            type: 'private',
            members: membersAsObjectIds,
            sortedMembersHash: sortedMembersHash,
        });

        await newChatRoom.save();

        const populatedRoom = await newChatRoom.populate('members', 'username profilePicture');
        res.status(201).json(populatedRoom);

    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});



// @route   POST /api/chat/messages/read
// @desc    Mark messages in a chat room as read for the authenticated user
// @access  Private
router.post('/messages/read', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatRoomId } = req.body;

        await ChatMessage.updateMany(
            {
                chatRoom: chatRoomId,
                sender: { $ne: userId }, // Messages sent by others
                readBy: { $ne: userId }  // Not yet read by this user
            },
            {
                $addToSet: { readBy: userId } // Add user to readBy array
            }
        );
        res.status(200).json({ msg: 'Messages marked as read' });
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET /api/chat/unreadCounts
// @desc    Get total unread message count and per-chat unread counts for the authenticated user
// @access  Private
router.get('/unreadCounts', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all chat rooms the user is a member of
        const chatRooms = await ChatRoom.find({ members: userId });

        let totalUnreadCount = 0;
        const perChatUnreadCounts = {};

        for (const room of chatRooms) {
            const unreadCount = await ChatMessage.countDocuments({
                chatRoom: room._id,
                sender: { $ne: userId }, // Messages sent by others
                readBy: { $ne: userId }  // Not yet read by this user
            });
            perChatUnreadCounts[room._id] = unreadCount;
            totalUnreadCount += unreadCount;
        }

        res.status(200).json({ totalUnreadCount, perChatUnreadCounts });
    } catch (err) {
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});


module.exports = router;