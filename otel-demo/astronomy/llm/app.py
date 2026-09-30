#!/usr/bin/python

# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

from flask import Flask, request, jsonify, Response
import json
import time
import random
import re
import os
import logging

from openfeature import api
from openfeature.contrib.provider.flagd import FlagdProvider

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

# Determine locale from NEXT_PUBLIC_LOCALE env var, default to 'en-US', take the first part
LOCALE = os.environ.get("NEXT_PUBLIC_LOCALE", "en-US").split("-")[0]

TRANSLATIONS = {
    "en": {
        "recommended_all_ages": "This product is recommended for ages 7 and above.",
        "no_negative_reviews": "No, there were no reviews less than three stars for this product.",
        "unable_to_answer": "Sorry, I'm not able to answer that question."
    },
    "ja": {
        "recommended_all_ages": "\u3053\u306e\u88fd\u54c1\u306f7\u6b73\u4ee5\u4e0a\u306b\u304a\u3059\u3059\u3081\u3067\u3059\u3002",
        "no_negative_reviews": "\u3044\u3044\u3048\u3001\u3053\u306e\u88fd\u54c1\u306b\u3064\u3044\u3066\u661f3\u3064\u672a\u6e80\u306e\u30ec\u30d3\u30e5\u30fc\u306f\u3042\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
        "unable_to_answer": "\u7533\u3057\u8a33\u3042\u308a\u307e\u305b\u3093\u304c\u3001\u305d\u306e\u8cea\u554f\u306b\u306f\u304a\u7b54\u3048\u3067\u304d\u307e\u305b\u3093\u3002"
    },
    "cs": {
        "recommended_all_ages": "Tento produkt je doporu\u010den pro v\u011bk 7 a v\u00edce let.",
        "no_negative_reviews": "Ne, u tohoto produktu nebyly \u017e\u00e1dn\u00e9 recenze s m\u00e9n\u011b ne\u017e t\u0159emi hv\u011bzdi\u010dkami.",
        "unable_to_answer": "Omlouv\u00e1m se, na tuto ot\u00e1zku nedok\u00e1\u017eu odpov\u011bd\u011bt."
    },
    "hi": {
        "recommended_all_ages": "\u092f\u0939 \u0909\u0924\u094d\u092a\u093e\u0926 7 \u0935\u0930\u094d\u0937 \u0914\u0930 \u0909\u0938\u0938\u0947 \u0905\u0927\u093f\u0915 \u0906\u092f\u0941 \u0915\u0947 \u0932\u093f\u090f \u0905\u0928\u0941\u0936\u0902\u0938\u093f\u0924 \u0939\u0948\u0964",
        "no_negative_reviews": "\u0928\u0939\u0940\u0902, \u0907\u0938 \u0909\u0924\u094d\u092a\u093e\u0926 \u0915\u0947 \u0932\u093f\u090f \u0924\u0940\u0928 \u0938\u094d\u091f\u093e\u0930 \u0938\u0947 \u0915\u092e \u0915\u094b\u0908 \u0938\u092e\u0940\u0915\u094d\u0937\u093e \u0928\u0939\u0940\u0902 \u0925\u0940\u0964",
        "unable_to_answer": "\u0915\u094d\u0937\u092e\u093e \u0915\u0930\u0947\u0902, \u092e\u0948\u0902 \u0909\u0938 \u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0926\u0947\u0928\u0947 \u092e\u0947\u0902 \u0938\u0915\u094d\u0937\u092e \u0928\u0939\u0940\u0902 \u0939\u0942\u0902\u0964"
    },
    "zh": {
        "recommended_all_ages": "\u672c\u4ea7\u54c1\u63a8\u8350 7 \u5c81\u53ca\u4ee5\u4e0a\u4eba\u7fa4\u4f7f\u7528\u3002",
        "no_negative_reviews": "\u4e0d\uff0c\u8be5\u4ea7\u54c1\u6ca1\u6709\u4f4e\u4e8e\u4e09\u661f\u7684\u8bc4\u4ef7\u3002",
        "unable_to_answer": "\u62b1\u6b49\uff0c\u6211\u65e0\u6cd5\u56de\u7b54\u8fd9\u4e2a\u95ee\u9898\u3002"
    }
}

def t(key):
    """Simple translation helper."""
    return TRANSLATIONS.get(LOCALE, TRANSLATIONS["en"]).get(key, TRANSLATIONS["en"][key])

product_review_summaries = None
inaccurate_product_review_summaries = None

def summary_file_for_locale(base_name):
    """
    Given 'product-review-summaries', returns:
    './product-review-summaries-LOCALE.json' if that file exists,
    otherwise './product-review-summaries.json' (the English default).
    """
    locale_file = f"./{base_name}-{LOCALE}.json"
    if os.path.exists(locale_file):
        return locale_file
    return f"./{base_name}.json"

def load_product_review_summaries(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:

            """
            Converts a JSON string into an internal dictionary optimized for quick lookups.
            The keys of the internal dictionary will be product_ids.
            """
            try:
                data = json.load(file)
                summaries = data.get("product-review-summaries", [])

                # Create a dictionary where product_id is the key
                # and the value is the summary
                product_review_summaries = {}
                for product in summaries:
                    product_id = product.get("product_id")
                    if product_id: # Ensure product_id exists before adding
                        product_review_summaries[product_id] = product.get("product_review_summary")
                return product_review_summaries
            except json.JSONDecodeError:
                print("Error: Invalid JSON string provided during initialization.")
                return {}

    except FileNotFoundError:
        app.logger.error(f"Error: The file '{file_path}' was not found.")
    except json.JSONDecodeError:
        app.logger.error(f"Error: Failed to decode JSON from the file '{file_path}'. Check for malformed JSON.")
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {e}")


def generate_response(product_id):

    """Generate a response by providing the pre-generated summary for the specified product"""
    product_review_summary = None

    llm_inaccurate_response = check_feature_flag("llmInaccurateResponse")
    app.logger.info(f"llmInaccurateResponse feature flag: {llm_inaccurate_response}")
    if llm_inaccurate_response and product_id == "L9ECAV7KIM":
        app.logger.info(f"Returning an inaccurate response for product_id: {product_id}")
        product_review_summary = inaccurate_product_review_summaries.get(product_id)
    else:
        product_review_summary = product_review_summaries.get(product_id)

    app.logger.info(f"product_review_summary is: {product_review_summary}")

    return product_review_summary

def parse_product_id(last_message):
    match = re.search(r"product ID:([A-Z0-9]+)", last_message)
    if match:
        return match.group(1).strip()

    match = re.search(r"product ID, but make the answer inaccurate:([A-Z0-9]+)", last_message)
    if match:
        return match.group(1).strip()

    raise ValueError("product ID not found in input message")

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json
    messages = data.get('messages', [])
    stream = data.get('stream', False)
    model = data.get('model', 'astronomy-llm')
    tools = data.get('tools', None)

    app.logger.info("Received a chat completion request")

    last_message = messages[-1]["content"]

    app.logger.info("Processing last chat message")

    if 'What age(s) is this recommended for?' in last_message:
        response_text = t("recommended_all_ages")
        return build_response(model, messages, response_text)
    elif 'Were there any negative reviews?' in last_message:
        response_text = t("no_negative_reviews")
        return build_response(model, messages, response_text)
    elif not ('Can you summarize the product reviews?' in last_message or 'Based on the tool results, answer the original question about product ID' in last_message):
        response_text = t("unable_to_answer")
        return build_response(model, messages, response_text)

    # otherwise, process the product review summary
    product_id = parse_product_id(last_message)

    if tools is not None:

        tool_args = f"{{\"product_id\": \"{product_id}\"}}"

        app.logger.info("Processing a tool call")

        app.logger.info("Processing requested model")
        if model.endswith("rate-limit"):
            app.logger.info("Returning a rate limit error")
            response = {
                "error": {
                    "message": "Rate limit reached. Please try again later.",
                    "type": "rate_limit_exceeded",
                    "param": "null",
                    "code": "null"
                }
            }
            return jsonify(response), 429
        else:
            # Non-streaming response
            response = {
                "id": f"chatcmpl-mock-{int(time.time())}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "requesting a tool call",
                        "tool_calls": [{
                            "id": "call",
                            "type": "function",
                            "function": {
                                "name": "fetch_product_reviews",
                                "arguments": tool_args
                            }
                        }]
                    },
                    "finish_reason": "tool_calls"
                }],
                "usage": {
                    "prompt_tokens": sum(len(m.get("content", "").split()) for m in messages),
                    "completion_tokens": "0",
                    "total_tokens": sum(len(m.get("content", "").split()) for m in messages)
                }
            }
            return jsonify(response)

    else:
        # Generate the response
        response_text = generate_response(product_id)

        return build_response(model, messages, response_text)

def build_response(model, messages, response_text):
    app.logger.info(f"Processing a response: '{response_text}'")

    response = {
        "id": f"chatcmpl-mock-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": sum(len(m.get("content", "").split()) for m in messages),
            "completion_tokens": len(str(response_text).split()),
            "total_tokens": sum(len(m.get("content", "").split()) for m in messages) + len(str(response_text).split())
        }
    }
    return jsonify(response)

@app.route('/v1/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        "object": "list",
        "data": [
            {
                "id": "astronomy-llm",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "astronomy-shop"
            }
        ]
    })

def check_feature_flag(flag_name: str):
    # Initialize OpenFeature
    client = api.get_client()
    return client.get_boolean_value(flag_name, False)

if __name__ == '__main__':

    api.set_provider(FlagdProvider(host=os.environ.get('FLAGD_HOST', 'flagd'), port=os.environ.get('FLAGD_PORT', 8013)))
    
    product_review_summaries_file_path = summary_file_for_locale("product-review-summaries")
    inaccurate_product_review_summaries_file_path = summary_file_for_locale("inaccurate-product-review-summaries")
    
    product_review_summaries = load_product_review_summaries(product_review_summaries_file_path)
    inaccurate_product_review_summaries = load_product_review_summaries(inaccurate_product_review_summaries_file_path)

    app.logger.info(product_review_summaries)

    print("OpenAI API server starting on http://localhost:8000")
    print("Set your OpenAI base URL to: http://localhost:8000/v1")
    app.run(host='0.0.0.0', port=8000)
