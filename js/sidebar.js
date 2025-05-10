// This file manages the sidebar functionality including menu toggling, active states,
// user profile display, and responsive behavior

// Wait for the DOM to be fully loaded before initializing sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get references to key elements in the page
    const sidebar = document.querySelector('.sidebar');              // The sidebar container
    const mainContent = document.querySelector('.main-content');    // The main content area
    const menuToggle = document.querySelector('.menu-toggle');      // The hamburger menu button
    
    // Function to highlight the current page in the sidebar menu
    function setActiveMenuItem() {
        // Get the current page URL path
        const currentPath = window.location.pathname;
        // Get all menu items in the sidebar
        const menuItems = document.querySelectorAll('.sidebar-menu-item');
        
        // Loop through each menu item
        menuItems.forEach(item => {
            // Get the link destination of the menu item
            const href = item.getAttribute('href');
            // If current page URL includes this link
            if (currentPath.includes(href)) {
                // Add active class to highlight it
                item.classList.add('active');
            } else {
                // Remove active class from other items
                item.classList.remove('active');
            }
        });
    }
    
    // Function to show/hide the sidebar
    function toggleSidebar() {
        // Toggle collapsed state of sidebar
        sidebar.classList.toggle('collapsed');
        // Toggle expanded state of main content
        mainContent.classList.toggle('expanded');
        
        // When sidebar is visible
        if (!sidebar.classList.contains('collapsed')) {
            // Create a dark overlay behind the sidebar
            const overlay = document.createElement('div');
            overlay.classList.add('sidebar-overlay');
            // Close sidebar when overlay is clicked
            overlay.addEventListener('click', toggleSidebar);
            // Add overlay to the page
            document.body.appendChild(overlay);
        } else {
            // When sidebar is hidden, remove the overlay
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }

    // Set up click handler for the menu toggle button
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar when clicking anywhere outside it
    document.addEventListener('click', function(event) {
        // Check if click was inside sidebar or on toggle button
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = menuToggle && menuToggle.contains(event.target);
        
        // If click was outside and sidebar is open, close it
        if (!isClickInsideSidebar && !isClickOnToggle && !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    });
    
    // Function to update the username displayed in the sidebar
    function updateSidebarUsername() {
        // Find the username display element
        const usernameElement = document.querySelector('.sidebar-profile-name');
        if (usernameElement) {
            // Try to get user data from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            // If user data exists and has a name, display it
            if (user && user.user_metadata && user.user_metadata.name) {
                usernameElement.textContent = user.user_metadata.name;
            }
        }
    }
    
    // Initialize sidebar functionality
    setActiveMenuItem();      // Highlight current page in menu
    updateSidebarUsername();  // Show user's name if available
    
    // Ensure sidebar starts in collapsed state on page load
    if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    // Set up logout functionality
    // Find all logout buttons (there might be multiple)
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        // Add click handler to each logout button
        button.addEventListener('click', function() {
            // Clear all stored data (user info, settings, etc.)
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login page
            window.location.href = 'login.html';
        });
    });
    
    // Handle window resize events
    window.addEventListener('resize', function() {
        // Remove overlay when window is resized
        // This prevents overlay from getting stuck on screen
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    });
});
