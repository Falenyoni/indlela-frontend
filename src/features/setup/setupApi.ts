const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface CreateOrganizationRequest {
  name: string
  contactEmail: string
  contactPhone: string
  physicalAddress: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}

export interface CreateOrganizationResponse {
  organizationId: string
  organizationName: string
  adminUserId: string
  adminEmail: string
}

export async function createOrganization(
  request: CreateOrganizationRequest,
  apiKey: string,
): Promise<CreateOrganizationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(request),
  })

  if (response.status === 401) throw new Error('Invalid API key.')
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Failed to create organization.')
  }

  return response.json()
}
