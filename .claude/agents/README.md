# Harmonix Pro Analyzer - Custom Agents

This directory contains specialized agents that enforce the strict quality standards defined in `CLAUDE.md`. These agents act as automated gatekeepers, ensuring every line of code meets Pablo's professional-grade requirements.

## Available Agents

### 🚨 Zero-Mock Enforcer (`zero-mock-enforcer`)
**Purpose**: Detects and prevents mock implementations, placeholder logic, and fake analysis.

**Enforces**: §2 Zero-Mock Policy from CLAUDE.md

**When to Use**:
- Before committing any new feature
- During code review
- When validating analysis implementations
- Before merging pull requests

**Example Usage**:
```
Please use @zero-mock-enforcer to review my BPM detection implementation
```

**What It Checks**:
- ✅ No hardcoded analysis values (BPM, key, tempo)
- ✅ No `Math.random()` in analysis paths
- ✅ No placeholder UI elements
- ✅ No fake export/download logic
- ✅ Real Essentia.js integration (not simulated)
- ✅ All buttons have real handlers
- ✅ Export functions generate meaningful data

**Violations Detected**:
```typescript
// ❌ VIOLATION - Hardcoded BPM
return { bpm: 120, confidence: 0.9 };

// ❌ VIOLATION - Random values
const spectral = Math.random() * 100;

// ❌ VIOLATION - Empty handler
<button onClick={() => {}}>Analyze</button>
```

---

### ✅ Implementation Verifier (`implementation-verifier`)
**Purpose**: Validates that features are fully complete according to the "Definition of Done".

**Enforces**: §5 Feature Completion Policy from CLAUDE.md

**When to Use**:
- Before marking a feature as "done"
- After completing a major implementation
- During sprint reviews
- Before demo/release

**Example Usage**:
```
@implementation-verifier please validate the export functionality is complete
```

**What It Checks**:
- ✅ Real implementation (not placeholder)
- ✅ Test coverage ≥40% (MVP) or ≥80% (production)
- ✅ UI behaves intelligently
- ✅ No dead buttons or broken navigation
- ✅ Export produces real, meaningful data
- ✅ Error states handled gracefully
- ✅ Loading states reflect actual progress

**Feature Completion Checklist**:
- [ ] Implementation uses real algorithms
- [ ] Tests written and passing
- [ ] Coverage meets threshold (40%/80%)
- [ ] UI fully functional
- [ ] Exports generate valid files
- [ ] Error handling comprehensive
- [ ] Performance measured

---

### 🎨 Aesthetic Validator (`aesthetic-validator`)
**Purpose**: Ensures UI/UX meets premium design standards.

**Enforces**: §3 Aesthetic & UI Standards from CLAUDE.md

**When to Use**:
- Before committing UI components
- During design reviews
- When creating new components
- When refactoring existing UI

**Example Usage**:
```
@aesthetic-validator review the new FileUpload component styling
```

**What It Checks**:
- ✅ Glassmorphic design system (transparency, blur, depth)
- ✅ Whitespace hierarchy and spacing discipline
- ✅ Clear empty states (never blank screens)
- ✅ Functional elements only (no dead buttons)
- ✅ Tooltips on disabled elements
- ✅ Smooth micro-interactions (transitions)
- ✅ Responsive layouts
- ✅ Typography and readability
- ✅ Accessible color contrast

**Design Standards**:
```css
/* ✅ CORRECT - Glassmorphic */
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* ❌ WRONG - Flat, no depth */
.card {
  background: #ffffff;
  border: 1px solid #ccc;
}
```

---

### 🏗️ Architecture Guardian (`architecture-guardian`)
**Purpose**: Enforces code quality, type safety, and architectural integrity.

**Enforces**: §4 Architecture & Code Standards from CLAUDE.md

**When to Use**:
- During code reviews
- When refactoring
- When architectural decisions are made
- Before major releases

**Example Usage**:
```
@architecture-guardian audit the new StreamingAnalysisEngine architecture
```

**What It Checks**:
- ✅ TypeScript strict mode enabled
- ✅ ZERO `any` types (use `unknown` with type guards)
- ✅ Components < 300 lines (no god components)
- ✅ Separation of concerns (UI ≠ Business ≠ API)
- ✅ Web Workers for heavy computation
- ✅ Memory management (WASM `.delete()` calls)
- ✅ Performance measured (not assumed)
- ✅ Clean state management (Context/useReducer)

**Architecture Violations**:
```typescript
// ❌ VIOLATION - any type
function process(data: any) { }

// ❌ VIOLATION - God component (500+ lines)
export const Dashboard: FC = () => {
  // Too many responsibilities
};

// ❌ VIOLATION - Main thread blocking
const bpm = detectBPM(buffer); // Should be in worker
```

---

## How to Use Agents

### Method 1: @-Mention in Chat
Simply mention the agent in your message:
```
@zero-mock-enforcer please review src/engines/RealEssentiaAudioEngine.ts
```

### Method 2: Invoke Directly
```
Please invoke the implementation-verifier agent to check if the export feature is complete
```

### Method 3: Automated Workflow
Integrate into your development workflow:

```bash
# Pre-commit hook
#!/bin/sh

# Run architectural checks
echo "Running architecture audit..."
claude "@architecture-guardian audit the staged changes"

# Verify no mock implementations
echo "Checking for mock implementations..."
claude "@zero-mock-enforcer scan staged files for violations"
```

---

## Agent Workflow Integration

### Development Phase
1. **During Implementation**:
   - Use `@zero-mock-enforcer` to catch mock logic early
   - Use `@architecture-guardian` for code structure

2. **UI Development**:
   - Use `@aesthetic-validator` for every new component
   - Validate responsive design and glassmorphic styling

3. **Feature Completion**:
   - Use `@implementation-verifier` before marking "done"
   - Ensure all checklist items pass

4. **Code Review**:
   - Run all four agents as final validation
   - Address any violations before merge

### Pre-Commit Checklist
```
[ ] @zero-mock-enforcer - No mock implementations
[ ] @implementation-verifier - Feature complete
[ ] @aesthetic-validator - UI meets design standards
[ ] @architecture-guardian - Code quality approved
[ ] All agent feedback addressed
```

---

## Agent Response Format

Each agent provides structured feedback:

```
## [Agent Name] Report: [Component/Feature]

### ✅ PASS Criteria
- [List of things that passed validation]

### ❌ FAIL Criteria
- [List of violations with line numbers]

### 🔧 Required Fixes
1. [Specific fix with code example]
2. [Another fix with reasoning]

### ✅ Approved for Merge: YES/NO
Reason: [Clear explanation]
```

---

## Agent Strictness Levels

### 🚨 CRITICAL (Zero-Mock Enforcer)
- **Strictness**: ABSOLUTE
- **Authority**: HALT all work on violations
- **Exceptions**: Only with explicit user authorization

### ✅ HIGH (Implementation Verifier)
- **Strictness**: STRICT
- **Authority**: Block "done" status on failures
- **Exceptions**: Rare, with documented tracking

### 🎨 MEDIUM-HIGH (Aesthetic Validator)
- **Strictness**: OPINIONATED
- **Authority**: Reject UI that doesn't meet standards
- **Exceptions**: With design justification

### 🏗️ HIGH (Architecture Guardian)
- **Strictness**: UNCOMPROMISING
- **Authority**: Require refactoring on violations
- **Exceptions**: None for critical standards (any types, memory leaks)

---

## Combining Agents

For comprehensive validation, invoke multiple agents:

```
Please have @zero-mock-enforcer, @implementation-verifier, @aesthetic-validator,
and @architecture-guardian all review the new analysis feature before I commit.
```

This ensures:
1. No mock logic (Zero-Mock Enforcer)
2. Feature fully complete (Implementation Verifier)
3. UI polished and professional (Aesthetic Validator)
4. Code quality and architecture sound (Architecture Guardian)

---

## Agent Model Configuration

Each agent uses optimized models:

| Agent | Model | Reason |
|-------|-------|--------|
| zero-mock-enforcer | Sonnet | Fast detection of patterns |
| implementation-verifier | Sonnet | Comprehensive validation |
| aesthetic-validator | Sonnet | Design review |
| architecture-guardian | Sonnet | Code analysis |

All agents use **allowed-tools**: Read, Grep, Glob, Bash for file analysis.

---

## Customizing Agents

To modify an agent's behavior:

1. **Edit the agent file**:
   ```bash
   code .claude/agents/zero-mock-enforcer.md
   ```

2. **Update frontmatter**:
   ```yaml
   ---
   name: zero-mock-enforcer
   description: "Your updated description"
   model: opus  # Change to opus for deeper analysis
   color: red
   allowed-tools:
     - Read
     - Grep
     - Custom-Tool
   ---
   ```

3. **Modify system prompt**:
   - Add/remove validation criteria
   - Update strictness levels
   - Change reporting format

4. **Save and reload**:
   Agents reload automatically on file changes.

---

## Troubleshooting

### Agent Not Found
**Problem**: `Agent 'zero-mock-enforcer' not found`

**Solution**:
```bash
# Verify agent files exist
ls -la .claude/agents/

# Check file naming
# Must match: name field in frontmatter = filename without .md
```

### Agent Not Strict Enough
**Problem**: Agent approves code that shouldn't pass

**Solution**:
- Edit agent file to add stricter criteria
- Switch model to `opus` for deeper analysis
- Add specific examples of violations to catch

### Agent Too Strict
**Problem**: Agent rejects valid code

**Solution**:
- Review agent validation criteria
- Add exception cases to agent prompt
- Provide more context when invoking agent

---

## Best Practices

1. **Run Agents Early**: Catch issues during development, not at PR time
2. **Address Violations Immediately**: Don't accumulate technical debt
3. **Use All Four Agents**: Comprehensive coverage prevents gaps
4. **Trust Agent Feedback**: They enforce Pablo's strict standards
5. **Update Agents**: Refine criteria as project evolves

---

## Agent Maintenance

### Weekly Review
- Check if agents caught recent violations
- Update validation criteria based on new patterns
- Add new edge cases to agent prompts

### Monthly Refinement
- Review false positives/negatives
- Update examples and patterns
- Adjust strictness levels if needed

### Continuous Improvement
- Document new violation patterns
- Share agent improvements across projects
- Keep agents in sync with CLAUDE.md updates

---

## Success Metrics

Track agent effectiveness:

- **Violation Detection Rate**: % of issues caught by agents
- **False Positive Rate**: % of incorrect rejections
- **Time Saved**: Hours saved vs manual review
- **Code Quality**: Reduction in bugs/tech debt

---

## Support

If agents aren't working as expected:

1. Check CLAUDE.md for latest standards
2. Review agent configuration and prompts
3. Verify agent has correct tools allowed
4. Test with simple examples first
5. Gradually increase complexity

---

## Summary

These four agents form a **comprehensive quality enforcement system**:

- **Zero-Mock Enforcer**: No fake implementations
- **Implementation Verifier**: Features fully complete
- **Aesthetic Validator**: UI premium quality
- **Architecture Guardian**: Code maintainable and performant

Together, they ensure **every commit meets professional-grade standards**.

Use them proactively. Trust their judgment. Address violations promptly.

**Quality is non-negotiable.**
