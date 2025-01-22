import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const getAll = async (event) => {
    const orgId = event.headers['x-organisation'];
    try {
        const params = {
            TableName: process.env.REPRESENTATIVES_TABLE,
            KeyConditionExpression: 'organisation = :orgId',
            ExpressionAttributeValues: {
                ':orgId': orgId
            }
        };
        
        const result = await dynamodb.query(params).promise();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch representatives' }) };
    }
};

export const addRepresentative = async (event) => {
    const orgId = event.headers['x-organisation'];
    const speaker = JSON.parse(event.body);
    
    try {
        const params = {
            TableName: process.env.REPRESENTATIVES_TABLE,
            Item: {
                organisation: orgId,
                number: speaker.number,
                name: speaker.name,
                sex: speaker.sex,
                group: speaker.group
            }
        };
        
        await dynamodb.put(params).promise();
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(params.Item)
        };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add representative' }) };
    }
}; 