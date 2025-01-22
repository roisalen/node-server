import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export const getList = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const orgId = event.headers['x-organisation'];
    if (!orgId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Organization ID is required in X-organisation header' })
        };
    }

    try {
        const params: DynamoDB.DocumentClient.GetItemInput = {
            TableName: process.env.SPEAKER_LISTS_TABLE!,
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

export const addSpeaker = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const orgId = event.headers['x-organisation'];
    if (!orgId || !event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required data' })
        };
    }

    const { speakerNumber, position } = JSON.parse(event.body);
    
    try {
        // Get speaker details
        const speaker = await dynamodb.get({
            TableName: process.env.REPRESENTATIVES_TABLE!,
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

        // Get current list
        const currentList = await dynamodb.get({
            TableName: process.env.SPEAKER_LISTS_TABLE!,
            Key: { organisation: orgId }
        }).promise();
        
        let list = currentList.Item?.list || [];
        const speakerWithDefaults = {
            ...speaker.Item,
            speaking: list.length === 0,
            replies: []
        };
        
        if (typeof position === 'number' && position >= 0) {
            list.splice(position, 0, speakerWithDefaults);
        } else {
            list.push(speakerWithDefaults);
        }
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE!,
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

export const removeSpeaker = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const orgId = event.headers['x-organisation'];
    const speakerRank = parseInt(event.pathParameters?.speakerRank || '-1');
    
    if (!orgId || speakerRank < 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request parameters' })
        };
    }

    try {
        const currentList = await dynamodb.get({
            TableName: process.env.SPEAKER_LISTS_TABLE!,
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
        if (speakerRank === 0 && list.length > 1) {
            list[1].speaking = true;
        }
        
        list.splice(speakerRank, 1);
        
        await dynamodb.put({
            TableName: process.env.SPEAKER_LISTS_TABLE!,
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