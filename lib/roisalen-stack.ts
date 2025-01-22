import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
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

    // Lambda Functions
    const getOrganizationsLambda = new NodejsFunction(this, 'GetOrganizationsFunction', {
      entry: 'lambdas/getOrganizations.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        ORGANIZATIONS_TABLE: organizationsTable.tableName,
      },
    });

    const deleteOrganizationLambda = new NodejsFunction(this, 'DeleteOrganizationFunction', {
      entry: 'lambdas/deleteOrganization.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        ORGANIZATIONS_TABLE: organizationsTable.tableName,
      },
    });

    // Grant permissions
    organizationsTable.grantReadWriteData(getOrganizationsLambda);
    organizationsTable.grantReadWriteData(deleteOrganizationLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'RoisalenApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // API Routes
    const orgsResource = api.root.addResource('organisations');
    orgsResource.addMethod('GET', new apigateway.LambdaIntegration(getOrganizationsLambda));

    const deleteOrgResource = orgsResource.addResource('IMSURE').addResource('{id}');
    deleteOrgResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteOrganizationLambda));

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
} 