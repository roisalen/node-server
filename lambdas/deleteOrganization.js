import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient();

export const handler = async (event) => {
    const orgId = event.pathParameters.id;
    
    // Verify the "IMSURE" safety check
    if (!event.path.includes('/IMSURE/')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Safety check failed' })
        };
    }

    try {
        const params = {
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