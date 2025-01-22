import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const handler = async (event) => {
    try {
        const params = {
            TableName: process.env.ORGANIZATIONS_TABLE
        };
        
        const result = await dynamodb.scan(params).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Error fetching organizations:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch organizations' })
        };
    }
}; 