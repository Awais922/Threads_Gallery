(function () {
    const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
    const LAST_ACTIVITY_KEY = 'threads_gallery_last_activity';
    const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];

    let monitoringStarted = false;
    let monitoringTimer = null;

    function normalizeRole(role) {
        return String(role || '').trim().toLowerCase();
    }

    function touchActivity() {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    function getLastActivity() {
        const storedValue = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        return Number.isFinite(storedValue) ? storedValue : 0;
    }

    function hasTimedOut(timeoutMs) {
        const lastActivity = getLastActivity();
        if (!lastActivity) {
            return false;
        }

        return Date.now() - lastActivity > timeoutMs;
    }

    function resetMonitoringTimer() {
        if (monitoringTimer) {
            clearInterval(monitoringTimer);
            monitoringTimer = null;
        }
    }

    function bindActivityTracking() {
        if (monitoringStarted) {
            return;
        }

        monitoringStarted = true;
        ACTIVITY_EVENTS.forEach((eventName) => {
            document.addEventListener(eventName, touchActivity, { capture: true, passive: true });
        });
        touchActivity();
    }

    async function safeSignOut(redirectTo = 'index.html') {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
        } catch (error) {
            console.warn('Sign out failed:', error.message);
        } finally {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            window.location.href = redirectTo;
        }
    }

    async function getCurrentSessionContext() {
        if (!window.supabaseClient) {
            return null;
        }

        const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
        if (sessionError || !sessionData?.session) {
            return null;
        }

        const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !userData?.user) {
            return null;
        }

        const user = userData.user;
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            return null;
        }

        const role = normalizeRole(profile?.role);
        const fullName = profile?.full_name || user.user_metadata?.full_name || 'User';

        return { user, profile, role, fullName };
    }

    function startTimeoutMonitor(timeoutMs, redirectTo) {
        bindActivityTracking();
        resetMonitoringTimer();

        monitoringTimer = setInterval(async () => {
            if (hasTimedOut(timeoutMs)) {
                await safeSignOut(redirectTo);
                return;
            }

            const { data } = await window.supabaseClient.auth.getSession();
            if (!data?.session) {
                await safeSignOut(redirectTo);
            }
        }, 30000);
    }

    async function redirectAuthenticatedUser({ customerUrl = 'home.html', adminUrl = 'admin.html', loginUrl = 'index.html' } = {}) {
        const context = await getCurrentSessionContext();
        if (!context) {
            return null;
        }

        if (context.role === 'admin') {
            window.location.href = adminUrl;
            return context;
        }

        if (context.role === 'customer') {
            window.location.href = customerUrl;
            return context;
        }

        await safeSignOut(loginUrl);
        return null;
    }

    async function protectPage({
        requiredRole = null,
        redirectTo = 'index.html',
        customerUrl = 'home.html',
        adminUrl = 'admin.html',
        timeoutMs = DEFAULT_TIMEOUT_MS,
        onAuthenticated = null,
    } = {}) {
        const context = await getCurrentSessionContext();
        if (!context) {
            window.location.href = redirectTo;
            return null;
        }

        if (hasTimedOut(timeoutMs)) {
            await safeSignOut(redirectTo);
            return null;
        }

        const role = normalizeRole(context.role);
        const expectedRole = normalizeRole(requiredRole);

        if (expectedRole && role !== expectedRole) {
            if (role === 'admin') {
                window.location.href = adminUrl;
            } else if (role === 'customer') {
                window.location.href = customerUrl;
            } else {
                await safeSignOut(redirectTo);
            }
            return null;
        }

        startTimeoutMonitor(timeoutMs, redirectTo);

        if (typeof onAuthenticated === 'function') {
            await onAuthenticated(context);
        }

        return context;
    }

    window.ThreadsGalleryAuth = {
        redirectAuthenticatedUser,
        protectPage,
        safeSignOut,
        touchActivity,
        normalizeRole,
    };
})();
