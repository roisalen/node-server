import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const getMessage = async (event) => {
    const orgId = event.headers['x-organisation'];
    try {
        const params = {
            TableName: process.env.MESSAGES_TABLE,
            Key: {
                organisation: orgId
            }
        };
        
        const result = await dynamodb.get(params).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(result.Item?.message || '')
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch message' }) };
    }
};

export const setMessage = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { message } = JSON.parse(event.body);
    
    try {
        await dynamodb.put({
            TableName: process.env.MESSAGES_TABLE,
            Item: {
                organisation: orgId,
                message: message
            }
        }).promise();
        
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message })
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to set message' }) };
    }
}; 