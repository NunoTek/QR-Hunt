param()

# Ask user how many commits to squash
$commitCount = Read-Host "How many commits do you want to squash?"

if (-not ($commitCount -as [int])) {
    Write-Host "❌ Please enter a valid number." -ForegroundColor Red
    exit 1
}

# Ask for commit message
$commitMessage = Read-Host "Enter the new commit message"

# Confirm
Write-Host "Squashing the last $commitCount commits into one with message: '$commitMessage'"
$confirm = Read-Host "Do you want to continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled."
    exit 0
}

# Perform interactive rebase
try {
    # Rebase n commits into one
    git reset --soft HEAD~$commitCount
    git commit -m "$commitMessage"

    # Push with force
    git push origin HEAD --force

    Write-Host "✅ Successfully squashed and pushed." -ForegroundColor Green
}
catch {
    Write-Host "❌ Something went wrong: $_" -ForegroundColor Red
}