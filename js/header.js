// Header functionality
document.addEventListener('DOMContentLoaded', function() {
    // Update header username
    function updateHeaderUsername() {
        const headerUsername = document.getElementById('headerUsername');
        if (headerUsername) {
            // Get username from localStorage if available
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user && user.user_metadata && user.user_metadata.name) {
                headerUsername.textContent = user.user_metadata.name;
            } else if (user && user.email) {
                // Use email if name is not available
                headerUsername.textContent = user.email.split('@')[0];
            }
        }
    }
    
    // Initialize
    updateHeaderUsername();
});
