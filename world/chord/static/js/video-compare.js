// Video synchronization function
function syncVideos(video1, video2) {
    video1.addEventListener('play', () => { if (video2.paused) video2.play(); });
    video1.addEventListener('pause', () => { if (!video2.paused) video2.pause(); });
    video2.addEventListener('play', () => { if (video1.paused) video1.play(); });
    video2.addEventListener('pause', () => { if (!video1.paused) video1.pause(); });
    video1.addEventListener('timeupdate', () => {
        const currentTime = video1.currentTime;
        if (Math.abs(currentTime - video2.currentTime) > 0.1) {
            video2.currentTime = currentTime;
        }
    });
    video1.addEventListener('seeked', () => { video2.currentTime = video1.currentTime; });
}
// Slider setup function
function setupSlider(container) {
    const slider = container.querySelector('.comparison-slider');
    const videoLeft = container.querySelector('.video-left');
    const videoRight = container.querySelector('.video-right');
    slider.addEventListener('mousedown', startDragging);
    function startDragging() {
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDragging);
    }
    function drag(e) {
        const containerRect = container.getBoundingClientRect();
        let offsetX = Math.max(0, Math.min(e.clientX - containerRect.left, containerRect.width));
        let offsetPercentage = (offsetX / containerRect.width) * 100;
        slider.style.left = offsetPercentage + '%';
        videoLeft.style.clipPath = `inset(0 ${100 - offsetPercentage}% 0 0)`;
        videoRight.style.clipPath = `inset(0 0 0 ${offsetPercentage}%)`;
    }
    function stopDragging() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDragging);
    }
}
// Lazy-loading video function
function lazyLoadVideos() {
    const videos = document.querySelectorAll("video[data-src]");
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const video = entry.target;
                if (!video.src) {
                    video.src = video.dataset.src;
                    video.load();
                    video.play();
                }
                obs.unobserve(video);
            }
        });
    }, {
        threshold: 0.25
    });
    videos.forEach(video => observer.observe(video));
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Select all comparison containers
    const containers = document.querySelectorAll('.comparison-container');
    
    // Loop through each container to apply the functions
    containers.forEach(container => {
        const video1 = container.querySelector('.video-left');
        const video2 = container.querySelector('.video-right');
        
        if (video1 && video2 && container) {
            syncVideos(video1, video2);
            setupSlider(container);
        }
    });

    // Lazy load videos on all containers
    lazyLoadVideos();
});