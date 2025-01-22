import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const getList = async (event) => {
    const orgId = event.headers['x-organisation'];
    try {
        const params = {
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Key: {
                organisation: orgId
            }
        };
        
        const result = await dynamodb.get(params).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(result.Item?.list || [])
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch speaker list' }) };
    }
};

export const addSpeaker = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { speakerNumber, position } = JSON.parse(event.body);
    
    try {
        // First get the current list
        const currentList = await dynamodb.get({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Key: { organisation: orgId }
        }).promise();
        
        // Get speaker details
        const speaker = await dynamodb.get({
            TableName: process.env.REPRESENTATIVES_TABLE,
            Key: { 
                organisation: orgId,
                number: speakerNumber
            }
        }).promise();
        
        if (!speaker.Item) {
            return { 
                statusCode: 404,
                body: JSON.stringify({ error: 'Speaker not found' })
            };
        }
        
        // Update the list
        let list = currentList.Item?.list || [];
        const speakerWithDefaults = {
            ...speaker.Item,
            speaking: list.length === 0,
            replies: []
        };
        
        if (typeof position === 'number') {
            list.splice(position, 0, speakerWithDefaults);
        } else {
            list.push(speakerWithDefaults);
        }
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Item: {
                organisation: orgId,
                list: list
            }
        }).promise();
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(list)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add speaker' }) };
    }
};

export const removeSpeaker = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { speakerRank } = event.pathParameters;
    
    try {
        const currentList = await dynamodb.get({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Key: { organisation: orgId }
        }).promise();
        
        let list = currentList.Item?.list || [];
        if (speakerRank >= list.length) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Speaker rank not found' })
            };
        }
        
        // If removing current speaker, set next speaker as speaking
        if (speakerRank == 0 && list.length > 1) {
            list[1].speaking = true;
        }
        
        list.splice(speakerRank, 1);
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Item: {
                organisation: orgId,
                list: list
            }
        }).promise();
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(list)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to remove speaker' }) };
    }
};

export const addReply = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { speakerRank } = event.pathParameters;
    const { replicantNumber } = JSON.parse(event.body);
    
    try {
        // Get current list and replicant details
        const [currentList, replicant] = await Promise.all([
            dynamodb.get({
                TableName: process.env.SPEAKER_LISTS_TABLE,
                Key: { organisation: orgId }
            }).promise(),
            dynamodb.get({
                TableName: process.env.REPRESENTATIVES_TABLE,
                Key: { 
                    organisation: orgId,
                    number: replicantNumber
                }
            }).promise()
        ]);
        
        if (!replicant.Item) {
            return { 
                statusCode: 404,
                body: JSON.stringify({ error: 'Replicant not found' })
            };
        }
        
        let list = currentList.Item?.list || [];
        if (speakerRank >= list.length) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Speaker not found' })
            };
        }
        
        // Add reply to speaker
        list[speakerRank].replies.push({
            ...replicant.Item,
            speaking: false
        });
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Item: {
                organisation: orgId,
                list: list
            }
        }).promise();
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(list)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add reply' }) };
    }
};

export const removeReply = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { speakerRank, replyRank } = event.pathParameters;
    
    try {
        const currentList = await dynamodb.get({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Key: { organisation: orgId }
        }).promise();
        
        let list = currentList.Item?.list || [];
        if (speakerRank >= list.length || !list[speakerRank].replies || replyRank >= list[speakerRank].replies.length) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Speaker or reply not found' })
            };
        }
        
        // Remove reply
        list[speakerRank].replies.splice(replyRank, 1);
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE,
            Item: {
                organisation: orgId,
                list: list
            }
        }).promise();
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(list)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to remove reply' }) };
    }
}; 