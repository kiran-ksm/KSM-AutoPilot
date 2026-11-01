# Cost Model — KSM AutoPilot

## Architecture Cost Drivers

KSM AutoPilot uses 100% serverless AWS services. Costs scale with usage; there is no always-on compute.

## Estimated Monthly Cost (dev, low traffic)

| Service | Usage assumption | Est. cost/month |
|---------|-----------------|-----------------|
| Lambda | 50k invocations, 256MB, avg 500ms | ~$0.10 |
| API Gateway REST | 50k requests | ~$0.18 |
| DynamoDB on-demand | 100k reads + 20k writes | ~$0.15 |
| S3 (static assets) | 1 GB storage + 50k GET | ~$0.05 |
| CloudFront | 5 GB transfer + 100k requests | ~$0.55 |
| Cognito | <50k MAUs (free tier) | $0.00 |
| Bedrock (Claude 3 Sonnet) | 100 scoring calls, ~1k tokens each | ~$0.30 |
| CloudWatch Logs | 1 GB/month | ~$0.50 |
| **Dev total** | | **~$1.83 / month** |

## Production Estimates (moderate traffic, 500 leads/month)

| Service | Usage assumption | Est. cost/month |
|---------|-----------------|-----------------|
| Lambda | 500k invocations | ~$1.00 |
| API Gateway REST | 500k requests | ~$1.75 |
| DynamoDB on-demand | 2M reads + 500k writes | ~$2.50 |
| S3 + CloudFront | 10 GB transfer | ~$2.00 |
| Bedrock | 500 AI scoring + 1000 summaries | ~$3.50 |
| SES email | 1000 emails | ~$0.10 |
| SNS SMS | 500 SMS (US) | ~$2.50 |
| CloudWatch | 5 GB logs | ~$2.50 |
| **Prod estimate** | | **~$15–25 / month** |

> These are rough estimates. Actual costs depend on Bedrock token usage, message volume, DynamoDB access pattern efficiency, and CloudFront caching effectiveness.

## Cost Optimization Controls

- DynamoDB PAY_PER_REQUEST (auto-scales, no idle cost)
- Lambda memory: 256MB dev / 512MB prod (right-sized)
- CloudFront caching: 1 year for hashed assets, no-cache for index.html
- Bedrock: invoked on-demand only, never per browser event
- CloudWatch log retention: 1 month per environment
- No reserved concurrency — Lambda scales from zero

## Cost Alerts (not yet implemented)

Before production launch, add CloudWatch billing alarms for:
- Daily Lambda cost > $5
- Bedrock daily token usage > threshold
- DynamoDB daily cost > $10
- SMS spend > $20/month per tenant
