#!/usr/bin/env python3
import re
import sys

def fix_and_pattern(content):
    """
    Fix patterns like {condition && (...)} to {condition ? (...) : null}
    This prevents React Native Web from rendering falsy values as text nodes.
    """
    # Pattern: {something && ( ... matching parens ... )}
    # We need to find opening { then condition && ( and match the closing )
    
    fixed = content
    iterations = 0
    max_iterations = 100  # Prevent infinite loops
    
    while iterations < max_iterations:
        # Find {condition && ( pattern
        pattern = r'\{([^{}]+?)\s*&&\s*\('
        
        def replacer(match):
            condition = match.group(1).strip()
            start_pos = match.end()
            
            # Find matching closing paren
            paren_count = 1
            pos = start_pos
            while pos < len(fixed) and paren_count > 0:
                if fixed[pos] == '(':
                    paren_count += 1
                elif fixed[pos] == ')':
                    paren_count -= 1
                pos += 1
            
            if paren_count == 0:
                # Found matching paren
                inner_content = fixed[start_pos:pos-1]
                # Check if followed by }
                if pos < len(fixed) and fixed[pos:pos+1] == '}':
                    # This is the pattern we want to fix
                    return f'{{{condition} ? (\n{inner_content}\n) : null}}'
            
            # Not the pattern, return original
            return match.group(0)
        
        new_content = re.sub(pattern, replacer, fixed, count=1)
        
        if new_content == fixed:
            # No more changes
            break
        
        fixed = new_content
        iterations += 1
    
    return fixed

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python fix_and_patterns.py <file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    fixed_content = fix_and_pattern(content)
    
    with open(filepath, 'w') as f:
        f.write(fixed_content)
    
    print(f"Fixed {filepath}")
