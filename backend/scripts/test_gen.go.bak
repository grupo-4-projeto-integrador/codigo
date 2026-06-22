package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

func main() {
	godotenv.Load(".env")
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	modelsToTest := []string{"gemini-flash-lite-latest", "gemini-2.0-flash-lite-001", "gemini-2.5-flash-lite", "gemini-3.5-flash"}

	for _, mName := range modelsToTest {
		fmt.Printf("\n--- Testando %s ---\n", mName)
		
		// Create a specific context for each model test so one timeout doesn't break the others
		testCtx, cancelTest := context.WithTimeout(context.Background(), 15*time.Second)
		
		model := client.GenerativeModel(mName)
		model.SetTemperature(0.7)
		
		resp, err := model.GenerateContent(testCtx, genai.Text(prompt))
		cancelTest()
		
		if err != nil {
			fmt.Printf("Erro em %s: %v\n", mName, err)
			continue
		}
		
		if len(resp.Candidates) > 0 {
			fmt.Printf("FinishReason: %v\n", resp.Candidates[0].FinishReason)
			if resp.Candidates[0].Content != nil {
				for _, part := range resp.Candidates[0].Content.Parts {
					if t, ok := part.(genai.Text); ok {
						fmt.Printf("Tamanho do texto: %d caracteres\n", len(t))
						if len(t) < 100 {
							fmt.Printf("TEXTO CURTO: %s\n", t)
						} else {
							fmt.Printf("TEXTO OK (início): %s\n", string(t)[:100])
						}
					}
				}
			} else {
				fmt.Println("Content é nil")
			}
		} else {
			fmt.Println("Sem candidatos.")
		}
	}
}
