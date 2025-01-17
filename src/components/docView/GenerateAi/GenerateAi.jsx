import { useState, useRef } from "react"
import axios from "axios"
import { Send, Loader2, Download } from "lucide-react"
import { Button } from "../../ui/button"
import { Textarea } from "../../ui/textarea"
import { Card, CardContent } from "../../ui/card"
import AccentImageAi from "./AiComponents/AccentImageAi"
import TwoColumnAi from "./AiComponents/TwoColumnAi"
import ImageTextAi from "./AiComponents/ImageTextAi"
import ThreeColumnAi from "./AiComponents/ThreeColumnAi"
import pptxgen from "pptxgenjs"
import DefaultAi from "./AiComponents/DefaultAi"

const getBase64FromImgElement = async (imgUrl) => {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        try {
          const base64 = canvas.toDataURL("image/png")
          resolve(base64)
        } catch (err) {
          reject(new Error("Failed to convert image to base64"))
        }
      }
      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
      img.crossOrigin = "anonymous"
      img.src = imgUrl
    })
  } catch (error) {
    console.error("Error converting image to base64:", error)
    return null
  }
}

const getComputedStyle = (element) => {
  if (element) {
    const styles = window.getComputedStyle(element)
    return {
      fontSize: Number.parseInt(styles.fontSize),
      color: styles.color,
      bold: styles.fontWeight === "bold",
      italic: styles.fontStyle === "italic",
      underline: styles.textDecoration.includes("underline"),
      align: styles.textAlign,
    }
  }
  return {
    fontSize: 12,
    color: "#FFFFFF",
    bold: false,
    italic: false,
    underline: false,
    align: "left",
  }
}

export default function GenerateAi() {
  const [slides, setSlides] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prompt, setPrompt] = useState("")
  const [editableSlides, setEditableSlides] = useState([])

  const enhancedPrompt = `
${prompt}

Generate a JSON response for ${prompt} for a presentation using the following predefined templates. Each template has specific requirements:

1. **AccentImage**:
   - Purpose: Emphasizes an image with a supporting description.
   - Fields:
     - **type**: "accentImage".
     - **title**: Slide title.
     - **description**: Text supporting the image.
     - **image**: Direct URL of the image.

2. **CardTemplateTwoColumn**:
   - Purpose: Displays two columns of content also use as comparison between two types or anything else.
   - Fields:
     - **type**: "twoColumn".
     - **title**: Slide title.
     - **columns**: Array of two objects, each containing:
       - **content**: Column content.

3. **ImageCardText**:
   - Purpose: just layout changed it takes an image first and then the title and description purpose of this template is to explain content with image.
   - Fields:
     - **type**: "imageCardText".
     - **title**: Slide title.
     - **description**: Text content for the slide.
     - **image**: Direct URL of the image.

4. **CardTemplateImgHeadingThree**:
   - Purpose: Highlights three images with headings and descriptions.
   - Fields:
     - **type**: "threeImgCard".
     - **title**: Slide title.
     - **cards**: Array of three objects, each containing:
       - **image**: Direct URL of the image.
       - **heading**: Card heading.
       - **description**: Supporting text for the card.

5. **Default**:
   - Purpose: General content for unmatched structures.
   - Fields:
     - **type**: "default".
     - **title**: Slide title.
     -**description**:slide description.

Return 8-10 slides in JSON format, ensuring each slide adheres to one of these templates. Do not include extra explanations or non-JSON text Note that the description's size 6 to 8 sentences and also don't bold any text just give normal text for title and description and also must note that provide only must available and apropreate to the topic image url reuired
Note : Ensure all images are accessible, relevant, and high-quality for the topic image url must available if not change url and provide only accessable image url.
`

  const validateAndParseJson = (text) => {
    try {
      const jsonStartIndex = text.indexOf("[")
      const jsonEndIndex = text.lastIndexOf("]")
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("No valid JSON found in the response.")
      }
      const jsonString = text.substring(jsonStartIndex, jsonEndIndex + 1)
      const slides = JSON.parse(jsonString)
      return slides
    } catch (err) {
      throw new Error("Invalid JSON structure or missing required fields.")
    }
  }

  const generateResponse = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCzVOUDgpnieFh5lJ1vY2sRImrVuZkM5zY",
        {
          contents: [{ parts: [{ text: enhancedPrompt }] }],
        },
        { headers: { "Content-Type": "application/json" } },
      )

      const aiText = response.data.candidates[0].content.parts[0].text
      const jsonSlides = validateAndParseJson(aiText)
      setSlides(jsonSlides)
      setEditableSlides(jsonSlides)
    } catch (err) {
      console.error("Error:", err)
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (index, updatedSlide) => {
    setEditableSlides((prevSlides) => {
      const newSlides = [...prevSlides]
      newSlides[index] = updatedSlide
      return newSlides
    })
  }

  const downloadPPT = async () => {
    try {
      const pptx = new pptxgen()

      for (let index = 0; index < editableSlides.length; index++) {
        const slide = editableSlides[index]
        const pptSlide = pptx.addSlide()

        // Set background color
        pptSlide.background = { color: "#342c4e" }

        const addStyledText = (text, options) => {
          if (text && typeof text === "string") {
            pptSlide.addText(text, {
              ...options,
              color: options.color || "#FFFFFF",
              fontFace: options.fontFace || "Arial",
              fontSize: options.fontSize || 12,
              bold: options.bold,
              italic: options.italic,
              underline: options.underline,
              align: options.align,
            })
          }
        }

        switch (slide.type) {
          case "accentImage": {
            const titleElement = document.querySelector(`#slide-${index} .title`)
            const descriptionElement = document.querySelector(`#slide-${index} .description`)

            addStyledText(slide.title, {
              x: 0.5,
              y: 0.5,
              w: "50%",
              h: 1,
              ...getComputedStyle(titleElement),
            })

            addStyledText(slide.description, {
              x: 0.5,
              y: 1.5,
              w: "50%",
              h: 3,
              ...getComputedStyle(descriptionElement),
            })

            if (slide.image) {
              try {
                const base64Image = await getBase64FromImgElement(slide.image)
                if (base64Image) {
                  pptSlide.addImage({
                    data: base64Image,
                    x: 5.5,
                    y: 1.5,
                    w: 4,
                    h: 3,
                  })
                }
              } catch (error) {
                console.error("Failed to add image to slide:", error)
              }
            }
            break
          }

          case "twoColumn": {
            const titleElement = document.querySelector(`#slide-${index} .title`)
            const contentElements = document.querySelectorAll(`#slide-${index} .content`)

            addStyledText(slide.title, {
              x: 0.5,
              y: 0.5,
              w: "90%",
              h: 1,
              ...getComputedStyle(titleElement),
            })

            if (slide.columns?.[0]?.content) {
              addStyledText(slide.columns[0].content, {
                x: 0.5,
                y: 1.5,
                w: "45%",
                h: 3,
                ...getComputedStyle(contentElements[0]),
              })
            }

            if (slide.columns?.[1]?.content) {
              addStyledText(slide.columns[1].content, {
                x: 5.5,
                y: 1.5,
                w: "45%",
                h: 3,
                ...getComputedStyle(contentElements[1]),
              })
            }
            break
          }

          case "imageCardText": {
            const titleElement = document.querySelector(`#slide-${index} .title`)
            const descriptionElement = document.querySelector(`#slide-${index} .description`)

            if (slide.image) {
              try {
                const base64Image = await getBase64FromImgElement(slide.image)
                if (base64Image) {
                  pptSlide.addImage({
                    data: base64Image,
                    x: 0.5,
                    y: 0.5,
                    w: 4,
                    h: 3,
                  })
                }
              } catch (error) {
                console.error("Failed to add image to slide:", error)
              }
            }

            addStyledText(slide.title, {
              x: 5.5,
              y: 0.5,
              w: "45%",
              h: 1,
              ...getComputedStyle(titleElement),
            })

            addStyledText(slide.description, {
              x: 5.5,
              y: 1.5,
              w: "45%",
              h: 3,
              ...getComputedStyle(descriptionElement),
            })
            break
          }

          case "threeImgCard": {
            const titleElement = document.querySelector(`#slide-${index} .title`)
            const headingElements = document.querySelectorAll(`#slide-${index} .heading`)
            const descriptionElements = document.querySelectorAll(`#slide-${index} .description`)

            addStyledText(slide.title, {
              x: 0.5,
              y: 0.5,
              w: "90%",
              h: 1,
              ...getComputedStyle(titleElement),
            })

            if (slide.cards) {
              for (let i = 0; i < slide.cards.length; i++) {
                const card = slide.cards[i]
                const xOffset = i * 3.3

                if (card.image) {
                  try {
                    const base64Image = await getBase64FromImgElement(card.image)
                    if (base64Image) {
                      pptSlide.addImage({
                        data: base64Image,
                        x: 0.5 + xOffset,
                        y: 1.5,
                        w: 3,
                        h: 2,
                      })
                    }
                  } catch (error) {
                    console.error("Failed to add card image to slide:", error)
                  }
                }

                addStyledText(card.heading, {
                  x: 0.5 + xOffset,
                  y: 3.5,
                  w: 3,
                  h: 0.5,
                  ...getComputedStyle(headingElements[i]),
                })

                addStyledText(card.description, {
                  x: 0.5 + xOffset,
                  y: 4,
                  w: 3,
                  h: 1,
                  ...getComputedStyle(descriptionElements[i]),
                })
              }
            }
            break
          }

          default: {
            const titleElement = document.querySelector(`#slide-${index} .title`)
            const descriptionElement = document.querySelector(`#slide-${index} .description`)

            addStyledText(slide.title, {
              x: 0.5,
              y: 0.5,
              w: "90%",
              h: 1,
              ...getComputedStyle(titleElement),
            })

            addStyledText(slide.description, {
              x: 0.5,
              y: 1.5,
              w: "90%",
              h: 4,
              ...getComputedStyle(descriptionElement),
            })
          }
        }
      }

      await pptx.writeFile({ fileName: "generated_presentation.pptx" })
    } catch (error) {
      console.error("Error generating PowerPoint:", error)
      setError("Failed to generate PowerPoint presentation. Please try again.")
    }
  }

  const renderSlide = (slide, index) => {
    const slideProps = {
      ...slide,
      index,
      onEdit: (updatedSlide) => handleEdit(index, updatedSlide),
    }

    switch (slide.type) {
      case "accentImage":
        return <AccentImageAi key={index} generateAi={slideProps} />
      case "twoColumn":
        return <TwoColumnAi key={index} generateAi={slideProps} />
      case "imageCardText":
        return <ImageTextAi key={index} generateAi={slideProps} />
      case "threeImgCard":
        return <ThreeColumnAi key={index} generateAi={slideProps} />
      default:
        return <DefaultAi key={index} generateAi={slideProps} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-lg border-0">
          <CardContent className="p-6 space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your topic for presentation..."
              className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
            <Button
              onClick={generateResponse}
              disabled={isLoading || !prompt}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Slides...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate Presentation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mt-4 bg-red-500/10 border-red-500/20 text-red-200">
            <CardContent className="p-4">Error: {error}</CardContent>
          </Card>
        )}

        {slides.length > 0 && (
          <div className="mt-8 space-y-8 ">
            {editableSlides.map((slide, index) => renderSlide(slide, index))}
            <Card className="bg-white/10  backdrop-blur-lg border-0 ">
              <CardContent className="p-6 flex justify-center">
                <Button onClick={downloadPPT} className="bg-green-600 hover:bg-green-700 text-white" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Download Presentation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

