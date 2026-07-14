# PulseWatch

A full-stack uptime monitoring application built with Node.js/Express, React, and PostgreSQL. Deployed on AWS using Terraform with auto-scaling groups and load balancing.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│ PostgreSQL  │
│  (React)    │     │  (Express)   │     │   (RDS)     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ Background  │
                    │  Worker     │
                    │ (60s polls) │
                    └─────────────┘
```

## Features

- **Real-time uptime monitoring** - Background worker checks URLs every 60 seconds
- **Incident tracking** - Automatic incident creation/resolution when endpoints go down/up
- **24-hour uptime statistics** - Per-endpoint uptime percentage
- **React dashboard** - Add monitors, view status cards, drill into detailed check history
- **Auto-scaling infrastructure** - AWS ASG with ALB for high availability
- **Infrastructure as Code** - Full Terraform deployment

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, pg (PostgreSQL client) |
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL (AWS RDS) |
| Infrastructure | Terraform, AWS (EC2, RDS, ALB, ASG, VPC) |
| CI/CD | GitHub Actions |

## Project Structure

```
pulsewatch/
├── app/
│   ├── index.js              # Express server + background worker
│   ├── package.json          # Backend dependencies
│   ├── pulsewatch.service    # systemd service file
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx       # Main React component
│       │   ├── components/   # UI components (MonitorList, MonitorDetail, etc.)
│       │   ├── styles/       # CSS modules
│       │   └── lib/          # Utilities
│       ├── package.json
│       └── vite.config.js
├── infra/
│   ├── main.tf               # Terraform root module
│   ├── providers.tf
│   ├── network.tf            # VPC, subnets, NAT, IGW
│   ├── security.tf           # Security groups
│   ├── iam.tf                # IAM roles/policies
│   ├── alb.tf                # Application Load Balancer
│   ├── asg.tf                # Auto Scaling Group + Launch Template
│   ├── rds.tf                # PostgreSQL RDS instance
│   ├── kms.tf                # KMS encryption keys
│   ├── outputs.tf
│   ├── variables.tf
│   └── terraform.tfvars
├── packer/
│   └── pulsewatch.pkr.hcl    # AMI build with Packer
└── .github/
    └── workflows/
        └── pipeline.yml      # CI/CD pipeline
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | Service info |
| POST | `/urls` | Add a new monitor (`{name, url}`) |
| GET | `/urls` | List all monitors with status & 24h uptime |
| GET | `/urls/:id` | Get monitor detail + recent checks |
| GET | `/urls/:id/incidents` | Get incident history |

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### Backend
```bash
cd app
npm install

# Set environment variables
export DB_HOST=localhost
export DB_NAME=pulsewatch
export DB_USER=postgres
export DB_PASSWORD=yourpassword
export PORT=3000

npm start
```

### Frontend
```bash
cd app/frontend
npm install
npm run dev
```

Visit `http://localhost:5173` (proxies to backend on 3000).

## AWS Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Terraform >= 1.5
- Packer (for AMI builds)
- SSH key pair in target region

### Build AMI
```bash
cd packer
packer init .
packer build pulsewatch.pkr.hcl
```

### Deploy Infrastructure
```bash
cd infra
terraform init
terraform plan
terraform apply
```

The pipeline in `.github/workflows/pipeline.yml` automates:
1. Packer AMI build on changes to `packer/` or `app/`
2. Terraform plan/apply on merge to main

## Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | - |
| `DB_NAME` | Database name | - |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `PORT` | Server port | `3000` |

## Database Schema

```sql
-- Monitored endpoints
CREATE TABLE monitored_urls (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual health checks
CREATE TABLE checks (
  id SERIAL PRIMARY KEY,
  url_id INT REFERENCES monitored_urls(id) ON DELETE CASCADE,
  status_code INT,
  response_time_ms INT,
  is_up BOOLEAN NOT NULL,
  checked_at TIMESTAMP DEFAULT NOW()
);

-- Downtime incidents
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  url_id INT REFERENCES monitored_urls(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE
);
```

## License

MIT