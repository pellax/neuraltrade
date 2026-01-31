#!/bin/bash

# Skill Creator Script
# Creates a new Antigravity skill with proper structure and initial files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SKILL_NAME=""
SKILL_DESCRIPTION=""
LOCATION="workspace"
INCLUDE_SCRIPTS=false
INCLUDE_EXAMPLES=false
INCLUDE_RESOURCES=false
WORKSPACE_ROOT=""

# Help message
show_help() {
    cat << EOF
${BLUE}Skill Creator${NC} - Create new Antigravity skills

${YELLOW}USAGE:${NC}
    $(basename "$0") [OPTIONS]

${YELLOW}OPTIONS:${NC}
    -n, --name NAME          Skill name (lowercase with hyphens)
    -d, --description DESC   Skill description (required)
    -l, --location LOC       Location: 'workspace' or 'global' (default: workspace)
    -w, --workspace PATH     Workspace root path (required for workspace location)
    -s, --scripts            Include scripts/ directory
    -e, --examples           Include examples/ directory
    -r, --resources          Include resources/ directory
    -a, --all                Include all optional directories
    -h, --help               Show this help message

${YELLOW}EXAMPLES:${NC}
    # Create a workspace skill with all directories
    $(basename "$0") -n code-reviewer -d "Reviews code quality" -w /path/to/workspace -a

    # Create a global skill with only scripts
    $(basename "$0") -n my-tool -d "My custom tool" -l global -s

    # Create a minimal skill
    $(basename "$0") -n simple-skill -d "A simple skill" -w .

${YELLOW}OUTPUT:${NC}
    Creates the following structure:
    
    <location>/<skill-name>/
    ├── SKILL.md           (main instruction file)
    ├── scripts/           (if -s or -a specified)
    ├── examples/          (if -e or -a specified)
    └── resources/         (if -r or -a specified)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            SKILL_NAME="$2"
            shift 2
            ;;
        -d|--description)
            SKILL_DESCRIPTION="$2"
            shift 2
            ;;
        -l|--location)
            LOCATION="$2"
            shift 2
            ;;
        -w|--workspace)
            WORKSPACE_ROOT="$2"
            shift 2
            ;;
        -s|--scripts)
            INCLUDE_SCRIPTS=true
            shift
            ;;
        -e|--examples)
            INCLUDE_EXAMPLES=true
            shift
            ;;
        -r|--resources)
            INCLUDE_RESOURCES=true
            shift
            ;;
        -a|--all)
            INCLUDE_SCRIPTS=true
            INCLUDE_EXAMPLES=true
            INCLUDE_RESOURCES=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$SKILL_NAME" ]]; then
    echo -e "${RED}Error: Skill name is required (-n, --name)${NC}"
    show_help
    exit 1
fi

if [[ -z "$SKILL_DESCRIPTION" ]]; then
    echo -e "${RED}Error: Skill description is required (-d, --description)${NC}"
    show_help
    exit 1
fi

# Validate and normalize skill name
SKILL_NAME=$(echo "$SKILL_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

if [[ ! "$SKILL_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo -e "${RED}Error: Invalid skill name. Must start with a letter and contain only lowercase letters, numbers, and hyphens.${NC}"
    exit 1
fi

# Determine skill path
if [[ "$LOCATION" == "global" ]]; then
    SKILL_PATH="$HOME/.gemini/antigravity/global_skills/$SKILL_NAME"
elif [[ "$LOCATION" == "workspace" ]]; then
    if [[ -z "$WORKSPACE_ROOT" ]]; then
        echo -e "${RED}Error: Workspace path is required for workspace location (-w, --workspace)${NC}"
        show_help
        exit 1
    fi
    # Expand relative path to absolute
    WORKSPACE_ROOT=$(cd "$WORKSPACE_ROOT" && pwd)
    SKILL_PATH="$WORKSPACE_ROOT/.agent/skills/$SKILL_NAME"
else
    echo -e "${RED}Error: Invalid location. Use 'workspace' or 'global'.${NC}"
    exit 1
fi

# Check if skill already exists
if [[ -d "$SKILL_PATH" ]]; then
    echo -e "${YELLOW}Warning: Skill directory already exists: $SKILL_PATH${NC}"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
    rm -rf "$SKILL_PATH"
fi

echo -e "${BLUE}Creating skill: ${GREEN}$SKILL_NAME${NC}"
echo -e "${BLUE}Location: ${GREEN}$SKILL_PATH${NC}"

# Create main directory
mkdir -p "$SKILL_PATH"

# Create optional directories
if $INCLUDE_SCRIPTS; then
    mkdir -p "$SKILL_PATH/scripts"
    echo -e "  ${GREEN}✓${NC} Created scripts/"
fi

if $INCLUDE_EXAMPLES; then
    mkdir -p "$SKILL_PATH/examples"
    echo -e "  ${GREEN}✓${NC} Created examples/"
fi

if $INCLUDE_RESOURCES; then
    mkdir -p "$SKILL_PATH/resources"
    echo -e "  ${GREEN}✓${NC} Created resources/"
fi

# Generate title from skill name
SKILL_TITLE=$(echo "$SKILL_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')

# Create SKILL.md
cat > "$SKILL_PATH/SKILL.md" << EOF
---
name: $SKILL_NAME
description: $SKILL_DESCRIPTION
---

# $SKILL_TITLE

<!-- Brief overview of what this skill accomplishes -->

## When to Use This Skill

- <!-- Trigger condition 1 -->
- <!-- Trigger condition 2 -->
- <!-- Trigger condition 3 -->

## Prerequisites

- <!-- Prerequisite 1 -->
- <!-- Prerequisite 2 -->

## Instructions

### Step 1: <!-- First Step Title -->

<!-- Detailed instructions for step 1 -->

### Step 2: <!-- Second Step Title -->

<!-- Detailed instructions for step 2 -->

### Step 3: <!-- Third Step Title -->

<!-- Detailed instructions for step 3 -->

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| <!-- option --> | <!-- default --> | <!-- description --> |

## Examples

### Example 1: <!-- Scenario Title -->

<!-- Example details and code -->

## Troubleshooting

- **<!-- Issue 1 -->**: <!-- Solution -->
- **<!-- Issue 2 -->**: <!-- Solution -->

## Notes

- <!-- Additional notes or considerations -->
EOF

echo -e "  ${GREEN}✓${NC} Created SKILL.md"

# Create placeholder files in optional directories
if $INCLUDE_SCRIPTS; then
    cat > "$SKILL_PATH/scripts/.gitkeep" << EOF
# Add helper scripts here
# Make executable with: chmod +x script.sh
# Document usage with: script.sh --help
EOF
fi

if $INCLUDE_EXAMPLES; then
    cat > "$SKILL_PATH/examples/.gitkeep" << EOF
# Add reference implementations here
# Include comments explaining key patterns
EOF
fi

if $INCLUDE_RESOURCES; then
    cat > "$SKILL_PATH/resources/.gitkeep" << EOF
# Add templates, data files, or other assets here
EOF
fi

echo ""
echo -e "${GREEN}✓ Skill created successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Edit ${BLUE}$SKILL_PATH/SKILL.md${NC} to add detailed instructions"
echo -e "  2. Add any helper scripts, examples, or resources as needed"
echo -e "  3. Test the skill by asking the agent to use it"
echo ""
echo -e "${BLUE}Skill location: ${NC}$SKILL_PATH"
