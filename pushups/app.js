// UI Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const topBar = document.getElementById('top-bar');
const bottomBar = document.getElementById('bottom-bar');
const targetInput = document.getElementById('target-input');
const actionText = document.getElementById('action-text');
const feedbackToast = document.getElementById('feedback-toast');
const countText = document.getElementById('count-text');
const goalToast = document.getElementById('goal-toast');

// Pushup State Variables
let pushupCount = 0;
let currentState = 'unknown';
let maxArmLength = 0;
let invalidFrameCount = 0;
let isActivePushup = false;
const FRAME_TOLERANCE = 12; // Debounce buffer to prevent flickering

// MoveNet Configuration
let detector;

// Connect the joints for the wireframe
const skeletonEdges = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
];

// Initialize Camera on Button Click (Bypasses iOS User Gesture block)
startBtn.addEventListener('click', async () => {
    startBtn.innerText = "Requesting Camera...";
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            video.play();
            // Sync canvas resolution to internal video resolution
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Hide start screen, show UI
            startScreen.classList.add('hidden');
            topBar.classList.remove('hidden');
            bottomBar.classList.remove('hidden');
            feedbackToast.classList.remove('hidden');
            
            loadAI();
        };
    } catch (err) {
        startBtn.innerText = "Camera Denied";
        startBtn.style.backgroundColor = "#FF3B30";
        alert("Please ensure you are accessing this site via HTTPS and allow camera permissions in Safari Settings.");
    }
});

async function loadAI() {
    await tf.setBackend('webgl');
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    });
    
    feedbackToast.innerText = "Step into frame";
    requestAnimationFrame(detectPose);
}

async function detectPose() {
    if (video.readyState < 2) {
        requestAnimationFrame(detectPose);
        return;
    }

    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawSkeleton(keypoints);
        processPushupLogic(keypoints);
    } else {
        handleInvalidPosture("Body not detected");
    }

    requestAnimationFrame(detectPose);
}

function processPushupLogic(keypoints) {
    // Map keypoints to a dictionary for easy access
    const kp = {};
    keypoints.forEach(k => {
        if (k.score > 0.3) kp[k.name] = { x: k.x, y: k.y };
    });

    const lShoulder = kp['left_shoulder'], rShoulder = kp['right_shoulder'];
    const lWrist = kp['left_wrist'], rWrist = kp['right_wrist'];
    const lHip = kp['left_hip'], rHip = kp['right_hip'];
    const lKnee = kp['left_knee'], rKnee = kp['right_knee'];

    if (!lShoulder || !rShoulder || !lWrist || !rWrist) {
        handleInvalidPosture("Show shoulders and wrists");
        return;
    }

    // Approximate missing joints from MoveNet based on available joints
    const neck = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 };
    let root = null;
    if (lHip && rHip) root = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };

    const shoulderWidth = distance(lShoulder, rShoulder);

    // 1. FORESHORTENING (Anti-Sitting/Standing)
    let isParallelToGround = true;
    if (root) {
        const verticalTorsoLength = root.y - neck.y;
        if (verticalTorsoLength > shoulderWidth * 0.6) isParallelToGround = false;
    }

    // 2. WRIST DROP (Anti-Air Pushup)
    let areWristsPlanted = true;
    const leftWristDrop = lWrist.y - lShoulder.y;
    const rightWristDrop = rWrist.y - rShoulder.y;
    if (leftWristDrop < shoulderWidth * 0.4 || rightWristDrop < shoulderWidth * 0.4) {
        areWristsPlanted = false;
    }

    // 3. PERSPECTIVE DEPTH (Anti-Knee)
    let isCorrectPerspective = true;
    if (root) {
        if (lWrist.y < root.y || rWrist.y < root.y) isCorrectPerspective = false;
    }
    if (lKnee && lWrist.y < lKnee.y) isCorrectPerspective = false;
    if (rKnee && rWrist.y < rKnee.y) isCorrectPerspective = false;

    // --- FAILURE ROUTING ---
    let errorMsg = null;
    if (!isParallelToGround) errorMsg = "Get parallel to ground (Torso)";
    else if (!areWristsPlanted) errorMsg = "Plant hands on the floor";
    else if (!isCorrectPerspective) errorMsg = "Get off knees / full plank";

    if (errorMsg) {
        handleInvalidPosture(errorMsg);
        return;
    }

    // --- VALID POSTURE FOUND ---
    invalidFrameCount = 0; // Reset debouncer
    isActivePushup = true; // Skeleton turns green

    const leftArmLength = distance(lShoulder, lWrist);
    const rightArmLength = distance(rShoulder, rWrist);
    const currentAvgArmLength = (leftArmLength + rightArmLength) / 2.0;

    if (currentAvgArmLength > maxArmLength) {
        maxArmLength = currentAvgArmLength;
    }

    const lengthRatio = maxArmLength > 0 ? (currentAvgArmLength / maxArmLength) : 1.0;

    let avgAngle = 180.0;
    const lElbow = kp['left_elbow'], rElbow = kp['right_elbow'];
    const elbowsVisible = lElbow && rElbow;

    if (elbowsVisible) {
        const leftAngle = angleBetween(lShoulder, lElbow, lWrist);
        const rightAngle = angleBetween(rShoulder, rElbow, rWrist);
        avgAngle = (leftAngle + rightAngle) / 2.0;
    }

    // Evaluate depth
    const isUp = lengthRatio > 0.85 || (elbowsVisible && avgAngle > 150);
    const isDown = lengthRatio < 0.60 || !elbowsVisible || (elbowsVisible && avgAngle < 110);

    if (isUp) {
        if (currentState === 'down') {
            pushupCount++;
            updateUI();
        }
        currentState = 'up';
        setFeedback("UP", "text-up");
    } else if (isDown) {
        currentState = 'down';
        setFeedback("DOWN", "text-down");
    }
}

function handleInvalidPosture(error) {
    invalidFrameCount++;
    if (invalidFrameCount > FRAME_TOLERANCE) {
        isActivePushup = false;
        actionText.classList.add('hidden');
        feedbackToast.classList.remove('hidden');
        feedbackToast.innerText = error;
    }
}

function setFeedback(msg, className) {
    actionText.innerText = msg;
    actionText.className = className; // Removes hidden class and adds color
    feedbackToast.classList.add('hidden');
}

function updateUI() {
    countText.innerText = pushupCount;
    const target = parseInt(targetInput.value);
    if (target > 0 && pushupCount >= target) {
        goalToast.classList.remove('hidden');
    } else {
        goalToast.classList.add('hidden');
    }
}

// --- Drawing Utility ---
function drawSkeleton(keypoints) {
    const color = isActivePushup ? '#34C759' : '#FF3B30'; // iOS Green or Red
    ctx.lineWidth = 6;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Draw lines
    skeletonEdges.forEach(edge => {
        const p1 = keypoints.find(k => k.name === edge[0]);
        const p2 = keypoints.find(k => k.name === edge[1]);

        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });

    // Draw joints
    keypoints.forEach(k => {
        if (k.score > 0.3) {
            ctx.beginPath();
            ctx.arc(k.x, k.y, 8, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// --- Math Utilities ---
function distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function angleBetween(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    let cosAngle = dot / (mag1 * mag2);
    cosAngle = Math.max(-1.0, Math.min(1.0, cosAngle));
    
    return Math.acos(cosAngle) * (180.0 / Math.PI);
}