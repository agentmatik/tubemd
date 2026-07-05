# Skill Format Research: Manus vs Claude Code

## Manus Skill Format

### Structure
```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (required): name, description
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation loaded as needed
    └── templates/        - Files used in output
```

### SKILL.md Requirements
- YAML frontmatter with `name` and `description` fields
- `description` is the PRIMARY trigger mechanism - must include what skill does AND when to use it
- Body: Markdown instructions, imperative/infinitive form
- Keep under 500 lines
- Progressive disclosure: metadata (~100 words) → SKILL.md body → bundled resources

### Key Principles
- "Manus is already very smart" - only add context it doesn't have
- Challenge each piece: "Does this justify its token cost?"
- Prefer concise examples over verbose explanations
- Set appropriate degrees of freedom (high/medium/low)
- No README.md, CHANGELOG.md - skills are for AI agents, not users

### Location
- `/home/ubuntu/skills/<skill-name>/SKILL.md`

---

## Claude Code Skill Format

### Structure
```
skill-name/
├── SKILL.md          # Main instructions (required)
├── template.md       # Template for Claude to fill in
├── examples/
│   └── sample.md     # Example output showing expected format
└── scripts/
    └── validate.sh   # Script Claude can execute
```

### SKILL.md Requirements
- YAML frontmatter between `---` markers
- Required fields: `name`, `description`
- Optional fields: `invocation` (auto|user|agent), `tools` (restrict tool access), `args` (arguments)
- `name` becomes the /slash-command
- `description` helps Claude decide when to auto-load

### Frontmatter Fields
| Field | Default | Purpose |
|-------|---------|---------|
| name | directory name | Slash command name |
| description | required | When to use the skill |
| invocation | auto | Who can invoke: auto, user, agent |
| tools | all | Restrict tool access |
| args | none | Define arguments |

### Key Differences from Manus
- Claude Code follows the "Agent Skills" open standard (cross-platform)
- Additional features: invocation control, subagent execution, dynamic context injection
- Skills can be personal (~/.claude/skills/), project (.claude/skills/), or enterprise
- Supports /slash-command invocation
- Can spawn parallel agents and use git worktrees
- Supports string substitutions: {{cwd}}, {{arguments}}, {{os}}, {{shell}}, {{hostname}}

### Location Options
- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Project: `.claude/skills/<skill-name>/SKILL.md`
- Plugin: `<plugin>/skills/<skill-name>/SKILL.md`

---

## YouTube to Skill: Design Considerations

### What a "YouTube to Skill" feature would generate:
From a YouTube transcript, the extension would generate a SKILL.md file that:
1. Extracts the procedural knowledge from the video
2. Structures it as actionable instructions
3. Includes proper YAML frontmatter
4. Organizes content into steps/workflows
5. Keeps it concise (under 500 lines for Manus)

### Two output formats needed:
1. **Manus Skill** - `/home/ubuntu/skills/<name>/SKILL.md`
2. **Claude Code Skill** - `~/.claude/skills/<name>/SKILL.md`

### The AI summarization would need to:
- Extract the core procedural knowledge (not just summarize)
- Identify the skill name and description from the video content
- Structure the content as imperative instructions
- Include code examples if the video covers coding
- Keep it token-efficient

### This is a PREMIUM feature because:
- Requires AI processing (API costs)
- High value for power users
- Unique differentiator from competitors
- Aligns with the "optimized for AI agents" positioning

Source: https://code.claude.com/docs/en/skills
Source: /home/ubuntu/skills/skill-creator/SKILL.md
