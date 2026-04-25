#!/usr/bin/env python3
import re

filepath = 'app/app/page.tsx'

with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix 1: Wave emoji - match any line with "Welcome back" followed by any character
# Line 1097
content = re.sub(
    r'Welcome back .+(?=\n)',
    'Welcome back 👋',
    content
)

# Fix 2: Transaction success toast - replace entire toast.success line
# Line 738
content = re.sub(
    r'toast\.success\(`[^`]*sent to \$\{phone\} [^`]*`\);',
    'toast.success(`₦${(data.amount || 0).toLocaleString()} – ${selectedPlan.sizeLabel} sent to ${phone} ✓`);',
    content
)

print(f"Content length: {len(content)}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed UTF-8 characters in app/app/page.tsx")
