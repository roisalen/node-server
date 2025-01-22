import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const getSubject = async (event) => {
    const orgId = event.headers['x-organisation'];
    try {
        const params = {
            TableName: process.env.SUBJECTS_TABLE,
            Key: {
                organisation: orgId
            }
        };
        
        const result = await dynamodb.get(params).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(result.Item?.subject || '')
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch subject' }) };
    }
};

export const setSubject = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { subject } = JSON.parse(event.body);
    
    try {
        await dynamodb.put({
            TableName: process.env.SUBJECTS_TABLE,
            Item: {
                organisation: orgId,
                subject: subject
            }
        }).promise();
        
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ subject })
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to set subject' }) };
    }
}; 