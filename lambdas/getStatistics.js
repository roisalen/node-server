import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const handler = async (event) => {
    const orgId = event.headers['x-organisation'];
    const { fromDate, toDate } = event.pathParameters;

    try {
        const params = {
            TableName: process.env.STATISTICS_TABLE,
            KeyConditionExpression: 'organisation = :orgId AND fullDate BETWEEN :fromDate AND :toDate',
            ExpressionAttributeValues: {
                ':orgId': orgId,
                ':fromDate': fromDate,
                ':toDate': toDate
            }
        };
        
        const result = await dynamodb.query(params).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch statistics' })
        };
    }
}; 