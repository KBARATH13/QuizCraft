const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        // Only required for group/classroom chats, not for private chats
    },
    type: {
        type: String,
        enum: ['private', 'group', 'classroom', 'global'], // 'global' for server-wide chat
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    // For private chats, we can ensure only two members
    // For classroom chats, link to Classroom model
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        // Only present if type is 'classroom'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    sortedMembersHash: {
        type: String,
        unique: true,
        sparse: true, // Only apply unique constraint if this field exists
    },
});

// Ensure unique private chats between two users using sortedMembersHash
chatRoomSchema.index({ sortedMembersHash: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'private' } });

// Update updatedAt on save
chatRoomSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;