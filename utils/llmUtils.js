export const transformSchemaForGoogle = (openAISchema) => {
  const { schema } = openAISchema

  const removeAdditionalProperties = (obj) => {
    const newObj = { ...obj }
    delete newObj.additionalProperties

    if (newObj.properties) {
      Object.keys(newObj.properties).forEach(key => {
        if (newObj.properties[key].additionalProperties) {
          newObj.properties[key] = removeAdditionalProperties(newObj.properties[key])
        }
      })
    }

    if (newObj.items && newObj.items.additionalProperties) {
      newObj.items = removeAdditionalProperties(newObj.items)
    }

    return newObj
  }

  return {
    description: openAISchema.name,
    ...removeAdditionalProperties(schema),
  }
}

export const parseMessagesForGoogle = (messages) => {
  const systemInstruction = messages.find(m => m.role === 'system')?.content

  const history = messages
    .filter(m => m.role !== 'system')
    .slice(0, -1)
    .map(m => ({
      role: m.role == 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

  const lastUserMessage = messages
    .filter(m => m.role == 'user')
    .slice(-1)[0]?.content || ''

  return { systemInstruction, history, lastUserMessage }
}
