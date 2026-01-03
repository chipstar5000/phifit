# GitHub SSH Deploy Key Setup

This document explains how the PhiFit repository is configured to push to GitHub using SSH authentication.

## Background

GitHub deprecated password authentication for git operations. This project uses SSH key authentication with a dedicated deploy key.

## SSH Key Configuration

### Key Location
- **Private key**: `~/.ssh/phifit_github`
- **Public key**: `~/.ssh/phifit_github.pub`
- **Key type**: ed25519 (modern standard)

### Key Generation Command
```bash
ssh-keygen -t ed25519 -C "phifit-deploy" -f ~/.ssh/phifit_github -N ""
```

### Public Key (Added to GitHub)
```
x
```

This key was added to: https://github.com/chipstar5000/phifit/settings/keys
- ✅ Write access enabled

## SSH Config

The SSH configuration at `~/.ssh/config` includes:

```
Host github.com-phifit
  HostName github.com
  User git
  IdentityFile ~/.ssh/phifit_github
  IdentitiesOnly yes
```

This creates a custom SSH host alias (`github.com-phifit`) that automatically uses the PhiFit deploy key.

## Git Remote Configuration

The repository remote is configured to use the SSH alias:

```bash
git remote -v
# origin  git@github.com-phifit:chipstar5000/phifit.git (fetch)
# origin  git@github.com-phifit:chipstar5000/phifit.git (push)
```

## Normal Git Operations

With this setup, standard git commands work without authentication prompts:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

## Manual Push (If Needed)

If you ever need to push manually with a specific key:

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/phifit_github -o StrictHostKeyChecking=accept-new" git push origin main
```

## Security Notes

- The private key (`~/.ssh/phifit_github`) should never be shared or committed to the repository
- The public key is safe to share and is visible on GitHub
- This deploy key is specific to the phifit repository only
- Write access is enabled on the deploy key to allow pushes

## Troubleshooting

### Test SSH Connection
```bash
ssh -T git@github.com-phifit
# Expected output: "Hi chipstar5000/phifit! You've successfully authenticated..."
```

### Verify Remote URL
```bash
git remote -v
# Should show: git@github.com-phifit:chipstar5000/phifit.git
```

### Check SSH Config
```bash
cat ~/.ssh/config
# Should include the github.com-phifit Host entry
```
