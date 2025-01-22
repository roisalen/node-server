import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class RoisalenStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const organizationsTable = new dynamodb.Table(this, 'Organizations', {
      partitionKey: { name: '_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const statisticsTable = new dynamodb.Table(this, 'Statistics', {
      partitionKey: { name: 'organisation', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'fullDate', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const representativesTable = new dynamodb.Table(this, 'Representatives', {
      partitionKey: { name: 'organisation', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'number', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const speakerListsTable = new dynamodb.Table(this, 'SpeakerLists', {
      partitionKey: { name: 'organisation', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const subjectsTable = new dynamodb.Table(this, 'Subjects', {
      partitionKey: { name: 'organisation', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const messagesTable = new dynamodb.Table(this, 'Messages', {
      partitionKey: { name: 'organisation', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'RoisalenApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-organisation'],
      },
    });

    // Lambda Functions with their API endpoints
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        ORGANIZATIONS_TABLE: organizationsTable.tableName,
        STATISTICS_TABLE: statisticsTable.tableName,
        REPRESENTATIVES_TABLE: representativesTable.tableName,
        SPEAKER_LISTS_TABLE: speakerListsTable.tableName,
        SUBJECTS_TABLE: subjectsTable.tableName,
        MESSAGES_TABLE: messagesTable.tableName,
      },
    };

    // Organizations endpoints
    const orgsResource = api.root.addResource('organisations');
    
    const getOrgsLambda = new lambda.Function(this, 'GetOrganizationsFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'getOrganizations.handler',
    });
    organizationsTable.grantReadData(getOrgsLambda);
    orgsResource.addMethod('GET', new apigateway.LambdaIntegration(getOrgsLambda));

    const deleteOrgLambda = new lambda.Function(this, 'DeleteOrganizationFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'deleteOrganization.handler',
    });
    organizationsTable.grantWriteData(deleteOrgLambda);
    const deleteOrgResource = orgsResource.addResource('IMSURE').addResource('{id}');
    deleteOrgResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteOrgLambda));

    // Representatives endpoints
    const representativesResource = api.root.addResource('representatives');
    
    const getAllRepsLambda = new lambda.Function(this, 'GetAllRepresentativesFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'representatives.getAll',
    });
    representativesTable.grantReadData(getAllRepsLambda);
    representativesResource.addMethod('GET', new apigateway.LambdaIntegration(getAllRepsLambda));

    const addRepLambda = new lambda.Function(this, 'AddRepresentativeFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'representatives.addRepresentative',
    });
    representativesTable.grantWriteData(addRepLambda);
    representativesResource.addMethod('POST', new apigateway.LambdaIntegration(addRepLambda));

    // Speaker List endpoints
    const speakerListResource = api.root.addResource('speakerList');
    
    const getListLambda = new lambda.Function(this, 'GetSpeakerListFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'speakerList.getList',
    });
    speakerListsTable.grantReadData(getListLambda);
    speakerListResource.addMethod('GET', new apigateway.LambdaIntegration(getListLambda));

    const addSpeakerLambda = new lambda.Function(this, 'AddSpeakerFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'speakerList.addSpeaker',
    });
    speakerListsTable.grantWriteData(addSpeakerLambda);
    representativesTable.grantReadData(addSpeakerLambda);  // Needs to read representatives
    speakerListResource.addMethod('POST', new apigateway.LambdaIntegration(addSpeakerLambda));

    const removeSpeakerLambda = new lambda.Function(this, 'RemoveSpeakerFunction', {
      ...commonLambdaProps,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'speakerList.removeSpeaker',
    });
    speakerListsTable.grantWriteData(removeSpeakerLambda);
    const speakerRankResource = speakerListResource.addResource('{speakerRank}');
    speakerRankResource.addMethod('DELETE', new apigateway.LambdaIntegration(removeSpeakerLambda));

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'OrganizationsTableName', {
      value: organizationsTable.tableName,
      description: 'Organizations DynamoDB table name',
    });
  }
}
