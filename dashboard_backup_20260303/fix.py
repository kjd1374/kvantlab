import os
with open('admin/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The misplaced chunk is lines 326 to 380 (indices 325 to 379)
misplaced_chunk = lines[325:380]

# Remove the misplaced chunk
del lines[325:380]

# Now we need to insert it back.
# It belongs right AFTER `<div class="form-group"` which is currently at line 539 in the *broken* file.
# But since we deleted 55 lines, the line `                <div class="form-group"\n` has shifted up by 55 lines.
# Line 539 was index 538. Now it is index 538 - 55 = 483.
# Let's verify by finding `<div class="form-group"\n` followed by `    <!-- Support Inquiry Reply Modal -->\n`
target_index = -1
for i, line in enumerate(lines):
    if '<div class="form-group"' in line and i + 1 < len(lines) and '<!-- Support Inquiry Reply Modal -->' in lines[i+1]:
        target_index = i + 1
        break

if target_index != -1:
    lines = lines[:target_index] + misplaced_chunk + lines[target_index:]
    with open('admin/index.html', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed!")
else:
    print("Could not find target index!")
