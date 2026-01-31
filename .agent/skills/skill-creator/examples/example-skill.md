---
name: api-helper
description: Generates boilerplate code for REST API endpoints including route handlers, validation, error handling, and tests. Use when the user asks to create a new API endpoint, add routes, or scaffold API functionality.
---

# API Helper

Generates standardized REST API boilerplate for new endpoints following project conventions.

## When to Use This Skill

- User asks to "create an API endpoint" or "add a route"
- User wants to scaffold CRUD operations for a resource
- User needs boilerplate for a new REST endpoint

## Prerequisites

- Express.js or similar HTTP framework installed
- Existing project structure with routes directory
- Understanding of target resource schema

## Instructions

### Step 1: Gather Endpoint Requirements

Ask the user for:
1. Resource name (e.g., "users", "products")
2. HTTP methods needed (GET, POST, PUT, DELETE)
3. Authentication requirements
4. Validation rules

### Step 2: Generate Route Handler

Create the route file in the appropriate directory:

```typescript
// routes/<resource>.ts
import { Router } from 'express';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import * as controller from '../controllers/<resource>';

const router = Router();

// GET /<resource> - List all
router.get('/', controller.list);

// GET /<resource>/:id - Get one
router.get('/:id', controller.getOne);

// POST /<resource> - Create
router.post('/', authenticate, validate(createSchema), controller.create);

// PUT /<resource>/:id - Update
router.put('/:id', authenticate, validate(updateSchema), controller.update);

// DELETE /<resource>/:id - Delete
router.delete('/:id', authenticate, controller.remove);

export default router;
```

### Step 3: Generate Controller

Create the controller with proper error handling:

```typescript
// controllers/<resource>.ts
import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/<resource>';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await ResourceService.findAll(req.query);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// ... additional controller methods
```

### Step 4: Generate Validation Schema

Create validation rules for incoming data:

```typescript
// validation/<resource>.ts
import Joi from 'joi';

export const createSchema = Joi.object({
  name: Joi.string().required(),
  // ... additional fields
});

export const updateSchema = createSchema.fork(
  Object.keys(createSchema.describe().keys),
  (key) => key.optional()
);
```

### Step 5: Generate Tests

Create test file for the new endpoint:

```typescript
// __tests__/<resource>.test.ts
describe('<Resource> API', () => {
  describe('GET /<resource>', () => {
    it('should return list of resources', async () => {
      // test implementation
    });
  });
  // ... additional tests
});
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| authRequired | true | Require authentication for write operations |
| pagination | true | Include pagination for list endpoints |
| validation | joi | Validation library to use |

## Examples

### Example 1: Create Products API

**Request**: "Create a products API with CRUD operations"

**Generated Structure**:
```
src/
├── routes/products.ts
├── controllers/products.ts
├── services/products.ts
├── validation/products.ts
└── __tests__/products.test.ts
```

## Troubleshooting

- **Route not found**: Ensure the route is registered in the main router
- **Validation errors**: Check schema matches expected request body
- **Auth failing**: Verify authentication middleware is properly configured

## Notes

- All endpoints follow RESTful conventions
- Error handling uses centralized error middleware
- Response format is standardized: `{ success: boolean, data?: T, error?: string }`
