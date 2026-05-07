# Layout Guidelines

## 1. Grouping Principles

- Make the AWS Cloud group the outermost layer
- Create subgroups by functional unit
- Arrange groups horizontally by default and place them along the data flow

### 1.1. Group hierarchy structure

```text
AWS Cloud (outermost layer)
├── VPC
│   ├── Public Subnet
│   │   └── ALB, NAT Gateway, etc.
│   └── Private Subnet
│       └── ECS, RDS, etc.
├── S3
├── CloudWatch
└── Other services
```

## 2. Connection line rules

### 2.1. Line style usage

| Flow type | Line style | Purpose |
|-----------|------|------|
| Ingestion Flow | Dashed line | Data ingestion |
| Query Flow | Solid line | Queries and references |
| Control Flow | Dotted line | Control and management |

### 2.2. Arrow direction

- Arrows should follow the direction of data flow
- Use bidirectional arrows for two-way communication

## 3. Layout principles

### 3.1. Left-to-right flow

```text
[Data source] -> [Processing] -> [Storage] -> [Analytics/Visualization]
```

### 3.2. Top-to-bottom flow (alternative)

```text
[User/Client]
        ↓
[Load balancer]
        ↓
[Application]
        ↓
[Database]
```

## 4. Readability

- Place labels close to the elements
- Adjust placement so arrows do not cross
- Group related elements and place them close together
- Leave enough whitespace to keep the diagram readable
