import os

with open('admin/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Backup
with open('/tmp/admin_index_backup.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

# The chunk we want to move is lines 326 to 380 (indices 325 to 379)
chunk_to_move = lines[325:380]

# Delete from bottom up so indices don't shift during deletion (though it's a slice so it's fine)
del lines[325:380]

# Now, we need to insert it back. 
# Originally, it was right before `    <!-- Support Inquiry Reply Modal -->` (which was line 540, index 539)
# After deleting 55 lines above it, index 539 becomes 539 - 55 = 484.
# Let's verify what is at index 484.
print("Line at index 483:", repr(lines[483]))
print("Line at index 484:", repr(lines[484]))

# Insert the chunk at index 484
lines = lines[:484] + chunk_to_move + lines[484:]

with open('admin/index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
    
print("Successfully restored the HTML structure!")
