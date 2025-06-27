import pandas as pd
import re

# Load the Excel file
file_path = "skill_set.xlsx"
df = pd.read_excel(file_path, engine='openpyxl')

# Normalize the skills for each user
processed_skills = []

for _, row in df.iterrows():
    entry = row.get("Skill")
    
    # Skip if the cell is empty or NaN
    if pd.isna(entry):
        processed_skills.append([])
        continue
    
    # 🧹 Remove bullet symbols, tabs, and other unwanted characters
    cleaned_entry = re.sub(r'[\uf0a7•▪\t*]+', '', str(entry))
    
    # Split using common skill separators
    split_skills = re.split(r'[,;\n·:–-]+', cleaned_entry)
    
    # Remove empty strings and trim each skill
    cleaned = [skill.strip() for skill in split_skills if skill.strip()]
    
    processed_skills.append(cleaned)

# Add a new column for processed skills
df["Processed Skills"] = processed_skills

# Optional: Display a preview
print(df[["Skill", "Processed Skills"]].head(10))

# Save to new Excel file
df.to_excel("processed_skills2.xlsx", index=False)
print("✅ Data exported to 'processed_skills.xlsx'")
