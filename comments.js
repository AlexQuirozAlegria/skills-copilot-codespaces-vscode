// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());
// Store all comments
const commentsByPostId = {};

// Get all comments by post id
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create new comment
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;
    const { id } = req.params;
    const comments = commentsByPostId[id] || [];

    comments.push({ id: commentId, content, status: 'pending' });
    commentsByPostId[id] = comments;

    // Send event to event bus
    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: id,
            status: 'pending',
        },
    });

    res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
    console.log('Event Received:', req.body.type);

    const { type, data } = req.body;

    // Check if event type is CommentModerated
    if (type === 'CommentModerated') {
        const { id, postId, status, content } = data;

        // Get comments by post id
        const comments = commentsByPostId[postId];

        // Find comment by id
        const comment = comments.find((comment) => {
            return comment.id === id;
        });

        // Update comment status
        comment.status = status;

        // Send event to event bus
        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content,
            },
        });
    }

    res.send({});
});

app.listen(4001, () => {
    console.log('Listening on 4001');
});