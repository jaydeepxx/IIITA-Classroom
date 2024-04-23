const express = require('express');
const router = express.Router();
const { Course, Assignment, Professor, Student, Submission } = require('../models/index');  // Ensure this path matches your setup
const Userauthenticate = require('../middleware/user');
const professorauthenticate = require('../middleware/professorAuth');
const userAuthenticate = require('../middleware/userAuth');
const upload = require('../middleware/Upload');

router.post('/:courseId', professorauthenticate, upload.single('file') , async (req, res) => {
    const { courseId } = req.params;
    const { title, description, dueDate} = req.body;
    const professorId = req.user.email; // Assuming req.user is populated from the authentication middleware
    const fileUrl = req.file ? req.file.location : null;
    const courseDetails = await Course.findOne({courseid: courseId});
    const professorDetails = await Professor.findOne({email: professorId});
    try {
        // Create a new assignment
        const newAssignment = new Assignment({
            title,
            description,
            dueDate,
            course: courseDetails._id,
            files: fileUrl,
            postedBy: professorDetails._id
        });

        // Save the assignment
        const savedAssignment = await newAssignment.save();
        // Add the assignment to the course's assignment list
        const updatedCourse = await Course.findByIdAndUpdate(courseDetails._id, {
            $push: { assignments: savedAssignment._id }
        }, { new: true }); // Optionally populate if you need to return full assignment details

        if (!updatedCourse) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.status(201).json({
            message: 'Assignment posted successfully',
            assignment: savedAssignment,
            course: updatedCourse
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to post assignment", error: err.message });
    }
});



router.post('/:courseId/submit', userAuthenticate, upload.single('file'), async (req, res) => {
    
    const { assignmentId } = req.body;
    const submissionFile = req.file ? req.file.location : null;
    // const studentId = req.user.email;
    try {
        const userDetail = await Student.findOne({email: req.user.email});
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).send({ message: 'Assignment not found.' });
        }

        const newSubmission = new Submission({
            assignment: assignmentId,
            student: userDetail._id, // assuming _id is set in JWT token
            submissionFile,
            submittedOn: new Date()
        });

        await newSubmission.save();
        await Student.findByIdAndUpdate(userDetail._id, {
            $push: { submissions: newSubmission._id }
        });
        await Assignment.findByIdAndUpdate(assignmentId,{
            $push: { submissions: newSubmission._id }
        
        });
        res.status(201).send({ message: 'Assignment submitted successfully.', submission: newSubmission });
    } catch (error) {
        res.status(500).send({ message: 'Failed to submit assignment.', error: error.message });
    }
});

router.get('/courses/:courseId/assignments', async (req, res) => {
    const { courseId } = req.params;

    try {
        const assignments = await Assignment.find({ course: courseId }).populate('postedBy', 'name');
        if (!assignments.length) {
            return res.status(404).send({ message: 'No assignments found for this course.' });
        }

        res.status(200).send(assignments);
    } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve assignments.', error: error.message });
    }
});

router.get('/courses/:courseId/assignments', async (req, res) => {
    const { courseId } = req.params;

    try {
        const assignments = await Assignment.find({ course: courseId }).populate('postedBy', 'name');
        if (!assignments.length) {
            return res.status(404).send({ message: 'No assignments found for this course.' });
        }

        res.status(200).send(assignments);
    } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve assignments.', error: error.message });
    }
});

module.exports = router;
