import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const orgId = event.pathParameters?.id;
    
    if (!orgId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Organization ID is required' })
        };
    }

    if (!event.path.includes('/IMSURE/')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Safety check failed' })
        };
    }

    try {
        if (!process.env.ORGANIZATIONS_TABLE) {
            throw new Error('ORGANIZATIONS_TABLE environment variable is not set');
        }

        const params: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: process.env.ORGANIZATIONS_TABLE,
            Key: {
                _id: orgId
            }
        };
        
        await dynamodb.delete(params).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Organization deleted' })
        };
    } catch (error) {
        console.error('Error deleting organization:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to delete organization' })
        };
    }
}; 