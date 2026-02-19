# Resume Reader Setup

The Resume reader uses OpenAI to extract candidate data from any resume PDF (LinkedIn export, standard resume, etc.) and attaches the file to the candidate.

## How it works

1. User uploads a PDF in Import → Resume reader
2. Next.js API route extracts text (unpdf) and calls the Supabase Edge Function
3. Edge Function uses OpenAI to parse the text into structured candidate data
4. User reviews the preview and clicks "Add to Candidates"
5. Candidate is created and the resume file is uploaded to Supabase Storage (attached to the candidate)

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy parse-resume
```

### 2. Set the OpenAI API key (Supabase secret)

The API key is stored in Supabase secrets, not in your app's env vars.

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

Get your key from [OpenAI API Keys](https://platform.openai.com/api-keys).

### 3. Verify

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set in your app env (already required for other features)
- The resumes bucket must exist (created by migrations)
- Upload a resume PDF in Import → Resume reader to test

## Cost

- Uses `gpt-4o-mini` (~$0.01–0.02 per resume)
- Each parse is a single API call
