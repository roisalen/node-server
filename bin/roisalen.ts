#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RoisalenStack } from '../lib/roisalen-stack';

const app = new cdk.App();
new RoisalenStack(app, 'RoisalenStack', {
  env: { 
    region: 'eu-west-1'
  },
}); 