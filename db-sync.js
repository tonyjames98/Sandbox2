/**
 * Supabase Database Syncing for Projection Data
 */

const DB_SYNC_TABLE = 'user_projections';

/**
 * Syncs the current projection data to Supabase if the user is logged in.
 * This is called by the main application whenever data changes.
 */
async function syncToSupabase() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // Get current data from local storage (already saved by saveData in script.js)
    const localData = localStorage.getItem('financeProjectionData');
    if (!localData) return;

    const dataObj = JSON.parse(localData);

    try {
        const { error } = await supabaseClient
            .from(DB_SYNC_TABLE)
            .upsert({ 
                user_id: session.user.id, 
                data: dataObj,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'user_id' 
            });

        if (error) {
            console.error('Error syncing to Supabase:', error.message);
        } else {
            console.log('Synced projection data to Supabase');
        }
    } catch (err) {
        console.error('Supabase sync error:', err);
    }
}

/**
 * Loads projection data from Supabase for the current user.
 * This should be called after a successful login.
 */
async function loadFromSupabase() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    try {
        const { data, error } = await supabaseClient
            .from(DB_SYNC_TABLE)
            .select('data')
            .eq('user_id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
            console.error('Error loading from Supabase:', error.message);
            return;
        }

        if (data && data.data) {
            // Save to local storage
            localStorage.setItem('financeProjectionData', JSON.stringify(data.data));
            
            // Trigger a reload in the main script
            if (typeof loadData === 'function') {
                loadData();
                
                // Re-run projection to update UI
                if (typeof runProjection === 'function') {
                    runProjection();
                }
                
                // Refresh UI components
                if (typeof renderInvestments === 'function') renderInvestments();
                if (typeof renderEvents === 'function') renderEvents();
                if (typeof renderGoals === 'function') renderGoals();
                if (typeof updateDashboard === 'function') updateDashboard();
                if (typeof displayPortfolioInsights === 'function') displayPortfolioInsights();
                
                console.log('Loaded projection data from Supabase');
            }
        }
    } catch (err) {
        console.error('Supabase load error:', err);
    }
}

// Add event listener for beforeunload and visibilitychange to save data
window.addEventListener('beforeunload', (event) => {
    syncToSupabase();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        syncToSupabase();
    }
});

// Hook into the original saveData function in script.js
(function() {
    // Wait for everything to load
    window.addEventListener('load', () => {
        if (typeof saveData === 'function') {
            const originalSaveData = saveData;
            window.saveData = function() {
                originalSaveData();
                syncToSupabase();
            };
        }
    });
})();
