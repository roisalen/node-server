import fetch from 'node-fetch';

const SERVER_URL = 'https://roisalen.no/rest';
const CUTOFF_DATE = new Date('2020-01-01');
const DELETE_MODE = process.argv.includes('--delete');
const SHOW_DATES = process.argv.includes('--dates');

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function fetchOrganizations() {
    const response = await fetch(`${SERVER_URL}/organisations`);
    return await response.json();
}

async function getLastActivity(orgId) {
    try {
        const fromDate = formatDate(CUTOFF_DATE);
        const toDate = formatDate(new Date());
        const response = await fetch(`${SERVER_URL}/statistics/date/${fromDate}/${toDate}`, {
            headers: {
                'X-organisation': orgId,
                'Content-Type': 'application/json'
            }
        });
        
        const stats = await response.json();
        if (!stats || stats.length === 0) {
            return null;
        }

        // Find the most recent date from all statistics entries
        const allDates = stats.reduce((dates, stat) => {
            if (stat.dates) {
                dates.push(...stat.dates);
            }
            return dates;
        }, []);

        if (allDates.length === 0) {
            return null;
        }

        // Convert dates and find the most recent one
        const lastActivity = allDates.reduce((latest, dateStr) => {
            const [day, month, year] = dateStr.split('.');
            const date = new Date(year, month - 1, day);
            return latest ? (date > latest ? date : latest) : date;
        }, null);

        return lastActivity;
    } catch (error) {
        console.error(`Error fetching statistics for ${orgId}`);
        return null;
    }
}

async function deleteOrganization(orgId) {
    try {
        const response = await fetch(`${SERVER_URL}/organisations/IMSURE/${orgId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error(`Failed to delete ${orgId}`);
        return false;
    }
}

async function processInactiveOrganizations() {
    try {
        const organizations = await fetchOrganizations();
        
        for (const org of organizations) {
            const lastActivity = await getLastActivity(org._id);
            
            if (!lastActivity) {
                if (DELETE_MODE) {
                    const deleted = await deleteOrganization(org._id);
                    console.log(`${org.name} (${org._id}) - No activity - ${deleted ? 'DELETED' : 'FAILED TO DELETE'}`);
                } else {
                    console.log(`${org.name} (${org._id})${SHOW_DATES ? ' - No activity recorded' : ''}`);
                }
            } else if (lastActivity < CUTOFF_DATE) {
                if (DELETE_MODE) {
                    const deleted = await deleteOrganization(org._id);
                    console.log(`${org.name} (${org._id}) - Last active ${lastActivity.toDateString()} - ${deleted ? 'DELETED' : 'FAILED TO DELETE'}`);
                } else {
                    console.log(`${org.name} (${org._id})${SHOW_DATES ? ` - Last active ${lastActivity.toDateString()}` : ''}`);
                }
            } else if (SHOW_DATES) {
                console.log(`${org.name} (${org._id}) - Active, last seen ${lastActivity.toDateString()}`);
            }
        }
    } catch (error) {
        console.error('Error in process:', error);
    }
}

processInactiveOrganizations(); 