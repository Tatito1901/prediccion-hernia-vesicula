import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

// Define the expected request body structure
interface AssignSurveyRequest {
  patientId: string;
  templateId: number;
}

// Define the response structure
interface AssignSurveyResponse {
  assignmentId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssignSurveyResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { patientId, templateId }: AssignSurveyRequest = req.body;

  if (!patientId || !templateId) {
    return res.status(400).json({ error: 'patientId and templateId are required.' });
  }

  try {
    // Create a Supabase client with the user's session
    const supabase = createPagesServerClient({ req, res });

    // Check for an authenticated user (optional but recommended)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Insert the new assigned survey into the database
    const { data, error } = await supabase
      .from('assigned_surveys')
      .insert({
        patient_id: patientId,
        template_id: templateId,
        status: 'pending',
      })
      .select('id') // Select the 'id' of the newly created row
      .single(); // Ensure only one row is returned

    if (error) {
      console.error('Supabase error assigning survey:', error);
      throw error;
    }

    if (!data || !data.id) {
        console.error('Assigned survey creation did not return an ID');
        return res.status(500).json({ error: 'Failed to create assigned survey.' });
    }

    // Return the unique ID of the new assignment
    return res.status(200).json({ assignmentId: data.id });

  } catch (error: any) {
    console.error('Error in /api/assign-survey:', error);
    return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
  }
}
