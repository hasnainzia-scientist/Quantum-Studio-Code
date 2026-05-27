# Deployment Guide: GitHub & Vercel

This repository is pre-configured to easily deploy a full-stack (Express + Vite React) application to **Vercel** continuously via **GitHub**.

## 1. Prepare and Push to GitHub

Since you are running this in the AI Studio cloud environment, you need to export the project and push the files to your GitHub account:

### Method A: Export using the UI (Recommended)
1. Click the **Settings/Menu** tab in the AI Studio editor.
2. Select **Export to GitHub**. 
3. Follow the on-screen prompts to authorize AI Studio to create a repository on your behalf and push the initial commit.

### Method B: Manual Git Workflow (If running locally)
If you download the project as a ZIP, initialize git yourself:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

## 2. Connect with Vercel

Once your project is hosted on GitHub, integrating with Vercel only takes a few clicks:

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project**.
3. Locate the GitHub repository you just created and click **Import**.
4. During the **Configure Project** step:
   - **Framework Preset**: Vercel should auto-detect **Vite**. 
   - Vercel will automatically read the `vercel.json` included in this project, which overrides settings to support the custom Express backend.
5. **Environment Variables**: Add your required variables (Expand the Environment Variables section):
   - `GEMINI_API_KEY`: Add your Gemini API key (for the AI features).
   - *Any other API keys needed by the app.*
6. Click **Deploy**. Vercel will bundle the React frontend using Vite and deploy the Express backend as a Serverless Function.

## 3. Important Vercel Caveats & Limitations

This application was engineered to use Serverless Functions on Vercel. However, because it originated as a VM-hosted service:

1. **Ephemeral File System (SQLite)**: 
   The application uses SQLite as its primary database. Vercel's serverless environment has a read-only filesystem (except for `/tmp`), which means the database is wiped on every cold boot. 
   - *Workaround Implemented*: The integration writes to `/tmp` in Vercel to allow the app to boot without errors, but any code/data saved will disappear shortly after you close the tab. If you need persistence, consider migrating to **Vercel Postgres** or similar managed DBs.

2. **Git Export Restrictions**: 
   The UI terminal and underlying git export API rely on native `git` binaries. These do not exist inside Vercel's Serverless environment.
   - *Workaround Implemented*: A safety check was added. If you attempt to use the built-in IDE Git Modal while hosted on Vercel, it will fail gracefully with a specific warning.

## 4. Scaling Up

For persistent databases and background workers that maintain standard container lifecycles, **Google Cloud Run** directly from Docker is the recommended, production-proof alternative to Vercel.
