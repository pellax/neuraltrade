---
name: skill-creator
description: Creates new Antigravity skills following official documentation standards. Use this skill when the user asks to create a new skill, define a custom capability, or add a reusable instruction set for the agent. Handles skill structure, SKILL.md frontmatter, and optional directories (scripts, examples, resources).
---

# Skill Creator

This skill helps you create new Antigravity skills following the official documentation and best practices.

## When to Use This Skill

- When the user asks to "create a skill", "add a skill", or "define a new capability"
- When the user wants to encapsulate a repeatable workflow into a reusable instruction set
- When the user needs to automate a specific task pattern that should be available across sessions

## Skill Location Options

Skills can be placed in two locations:

1. **Workspace-specific** (recommended for project-specific skills):
   ```
   <workspace-root>/.agent/skills/<skill-folder>/
   ```

2. **Global** (for skills available in all workspaces):
   ```
   ~/.gemini/antigravity/global_skills/<skill-folder>/
   ```

## Required Files

### `SKILL.md` (Required)

Every skill MUST have a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name-here
description: Clear description of what this skill does and when to use it.
---

# Skill Title

Detailed instructions for the agent.

## When to Use This Skill
- Condition 1
- Condition 2

## How to Use It
1. Step 1
2. Step 2
3. Step 3
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Optional | Unique identifier (lowercase with hyphens). Defaults to folder name. |
| `description` | **Required** | Clear explanation of what the skill does. This is CRITICAL - it's used during Discovery phase to determine relevance. |

## Optional Directories

| Directory | Purpose |
|-----------|---------|
| `scripts/` | Helper scripts the agent can execute |
| `examples/` | Reference implementations to follow |
| `resources/` | Templates, data files, or other assets |

## Creating a New Skill - Step by Step

### Step 1: Gather Requirements

Ask the user for:
1. **Skill name**: What should this skill be called? (lowercase with hyphens)
2. **Description**: What does this skill do? When should it be used?
3. **Location**: Workspace-specific or global?
4. **Scope**: What specific task or workflow does it handle?
5. **Additional resources**: Does it need scripts, examples, or templates?

### Step 2: Determine Skill Location

```bash
# For workspace-specific skill:
SKILL_PATH="<workspace-root>/.agent/skills/<skill-name>"

# For global skill:
SKILL_PATH="$HOME/.gemini/antigravity/global_skills/<skill-name>"
```

### Step 3: Create Directory Structure

```bash
mkdir -p "$SKILL_PATH"

# Add optional directories as needed:
mkdir -p "$SKILL_PATH/scripts"    # If helper scripts are needed
mkdir -p "$SKILL_PATH/examples"   # If reference implementations are needed
mkdir -p "$SKILL_PATH/resources"  # If templates/assets are needed
```

### Step 4: Create SKILL.md

Create the `SKILL.md` file with:

1. **Frontmatter**: `name` and `description`
2. **Title**: Clear heading
3. **When to Use**: List of trigger conditions
4. **Instructions**: Step-by-step guide for the agent
5. **Decision Trees**: Logic for choosing approaches (if applicable)
6. **Examples**: Usage examples when helpful

### Step 5: Add Scripts (Optional)

If the skill needs helper scripts:

1. Create scripts in the `scripts/` directory
2. Make them executable: `chmod +x scripts/*.sh`
3. Document usage with `--help` flag
4. In SKILL.md, instruct the agent to run `script.sh --help` instead of reading source code (saves context)

### Step 6: Add Examples (Optional)

If the skill benefits from reference implementations:

1. Add example files in `examples/` directory
2. Include comments explaining key patterns
3. Reference examples in SKILL.md instructions

### Step 7: Verify the Skill

1. Check that SKILL.md has valid YAML frontmatter
2. Verify the description is clear and contains relevant keywords
3. Ensure instructions are specific and actionable
4. Test any scripts work correctly

## Best Practices

1. **Single Focus**: Each skill should handle ONE specific task or workflow
2. **Clear Descriptions**: Use third-person voice and keywords for discovery
3. **Black Box Scripts**: If using scripts, instruct agent to use `--help` flag
4. **Decision Trees**: Include logic to help agent choose the best approach
5. **Progressive Disclosure**: Keep SKILL.md concise, link to details in subdirectories

## Example: Creating a "Code Review" Skill

User request: "Create a skill that performs code reviews following our team's standards"

```bash
# 1. Create structure
mkdir -p .agent/skills/code-reviewer/{scripts,examples,resources}

# 2. Create SKILL.md
cat > .agent/skills/code-reviewer/SKILL.md << 'EOF'
---
name: code-reviewer
description: Performs comprehensive code reviews following team standards. Use when the user asks for a code review, PR review, or wants feedback on code quality, security, and best practices.
---

# Code Reviewer

Reviews code for quality, security, maintainability, and adherence to team standards.

## When to Use This Skill

- User asks for a "code review" or "review my code"
- User wants feedback on a pull request
- User asks about code quality or best practices

## How to Perform a Review

1. Identify files to review (from user input or git diff)
2. Check each area:
   - Code correctness
   - Security vulnerabilities
   - Performance issues
   - Code style and readability
   - Test coverage
3. Provide actionable feedback with specific line references
4. Suggest improvements with code examples
EOF

# 3. Add resources (e.g., checklist template)
cat > .agent/skills/code-reviewer/resources/checklist.md << 'EOF'
# Code Review Checklist

## Security
- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] SQL injection prevention

## Quality
- [ ] Clear naming
- [ ] Proper error handling
- [ ] Adequate comments
EOF
```

## Template for Quick Skill Creation

Use this template as a starting point:

```markdown
---
name: <skill-name>
description: <What this skill does>. Use when <trigger conditions>.
---

# <Skill Title>

<Brief overview of what this skill accomplishes>

## When to Use This Skill

- <Trigger condition 1>
- <Trigger condition 2>
- <Trigger condition 3>

## Prerequisites

- <Prerequisite 1>
- <Prerequisite 2>

## Instructions

### Step 1: <First Step>
<Detailed instructions>

### Step 2: <Second Step>
<Detailed instructions>

### Step 3: <Third Step>
<Detailed instructions>

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| <option1> | <default> | <description> |

## Examples

### Example 1: <Scenario>
<Example details>

## Troubleshooting

- **Issue 1**: <Solution>
- **Issue 2**: <Solution>
```

## Notes

- Skills follow Progressive Disclosure: Discovery → Activation → Execution
- The `description` field is critical for discovery - include relevant keywords
- Keep SKILL.md focused and actionable
- Use subdirectories for supplementary materials
