// This file handles the loading animation (preloader) that shows while the page is loading
// and provides functions to show/hide it programmatically

// Wait for the initial HTML document to be loaded and parsed
document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the preloader element (typically a loading spinner or animation)
    // Expects an element with class 'preloader' in the HTML
    const preloader = document.querySelector('.preloader');
    
    // Listen for when ALL resources (images, scripts, etc.) are fully loaded
    window.addEventListener('load', function() {
        // Use requestAnimationFrame to ensure smooth animation
        // This schedules the hiding of the preloader for the next frame
        requestAnimationFrame(() => {
            // Add 'hidden' class to trigger fade-out animation
            preloader.classList.add('hidden');
            
            // After animation completes, completely remove preloader from view
            setTimeout(function() {
                // Set display to 'none' to remove from layout flow
                preloader.style.display = 'none';
            }, 300); // Wait 300ms for fade animation to complete
        });
    });
    
    // Handle page navigation preloading
    document.addEventListener('click', function(e) {
        // Check if clicked element is a link or has a link parent
        const target = e.target.closest('a');
        
        // Only handle links that:
        // 1. Exist and have an href
        // 2. Don't link to page sections (don't start with #)
        // 3. Are to the same origin (same website)
        // 4. Open in same window (no target="_blank")
        // 5. Weren't clicked with Ctrl/Cmd key (which typically opens in new tab)
        if (target && target.href && !target.href.startsWith('#') && 
            target.href.indexOf(window.location.origin) === 0 && 
            !target.target && !e.ctrlKey && !e.metaKey) {
            
            // Navigate to the new page immediately
            // Note: Preloader will show automatically on new page load
            window.location.href = target.href;
        }
    });
});

// Utility function to manually show the preloader
// Useful for operations like form submissions where we want to show loading state
function showPreloader() {
    // Find the preloader element
    const preloader = document.querySelector('.preloader');
    
    // If preloader exists:
    if (preloader) {
        // Remove the 'hidden' class that might be hiding it
        preloader.classList.remove('hidden');
        // Make it visible and use flex layout
        preloader.style.display = 'flex';
    }
}
