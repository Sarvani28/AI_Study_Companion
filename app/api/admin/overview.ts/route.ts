import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/security/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    /*
     * Server-side authentication + authorization.
     */
    await requireAdmin();

    /*
     * Secret-key Supabase client.
     *
     * This is ONLY used on the server after
     * the admin role has been verified.
     */
    const supabase =
      createAdminClient();

    /*
     * ------------------------------------------
     * Users
     * ------------------------------------------
     */

    const {
      count: userCount,
      error: usersError,
    } = await supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (usersError) {
      throw usersError;
    }

    /*
     * ------------------------------------------
     * Projects
     * ------------------------------------------
     */

    const {
      count: projectCount,
      error: projectsError,
    } = await supabase
      .from("projects")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (projectsError) {
      throw projectsError;
    }

    /*
     * ------------------------------------------
     * Materials
     * ------------------------------------------
     */

    const {
      count: materialCount,
      error: materialsError,
    } = await supabase
      .from("materials")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (materialsError) {
      throw materialsError;
    }

    /*
     * ------------------------------------------
     * AI requests
     * ------------------------------------------
     */

    const {
      data: aiRequests,
      error: aiError,
    } = await supabase
      .from("ai_requests")
      .select(`
        feature,
        model,
        latency_ms,
        input_tokens,
        output_tokens,
        estimated_cost,
        success
      `);

    if (aiError) {
      throw aiError;
    }

    const tutorRequests =
      aiRequests?.filter(
        (request) =>
          request.feature ===
          "tutor"
      ).length ?? 0;

    const quizEvaluation =
      aiRequests?.filter(
        (request) =>
          request.feature.includes(
            "quiz"
          )
      ).length ?? 0;

    const recommendations =
      aiRequests?.filter(
        (request) =>
          request.feature.includes(
            "recommend"
          )
      ).length ?? 0;

    const totalRequests =
      aiRequests?.length ?? 0;

    const successfulRequests =
      aiRequests?.filter(
        (request) =>
          request.success === true
      ).length ?? 0;

    const successRate =
      totalRequests > 0
        ? (successfulRequests /
            totalRequests) *
          100
        : 0;

    const latencies =
      aiRequests
        ?.map(
          (request) =>
            request.latency_ms
        )
        .filter(
          (
            value
          ): value is number =>
            typeof value ===
              "number" &&
            value >= 0
        ) ?? [];

    const averageLatency =
      latencies.length > 0
        ? latencies.reduce(
            (
              total,
              value
            ) =>
              total + value,
            0
          ) /
          latencies.length
        : 0;

    /*
     * ------------------------------------------
     * Background jobs
     * ------------------------------------------
     */

    const {
      data: materialStatuses,
      error: statusError,
    } = await supabase
      .from("materials")
      .select("status");

    if (statusError) {
      throw statusError;
    }

    const completedJobs =
      materialStatuses?.filter(
        (item) =>
          item.status ===
          "ready"
      ).length ?? 0;

    const processingJobs =
      materialStatuses?.filter(
        (item) =>
          item.status ===
          "processing"
      ).length ?? 0;

    const failedJobs =
      materialStatuses?.filter(
        (item) =>
          item.status ===
          "failed"
      ).length ?? 0;

    return NextResponse.json({
      overview: {
        users:
          userCount ?? 0,

        projects:
          projectCount ?? 0,

        materials:
          materialCount ?? 0,

        tutorRequests,

        aiUsage: {
          tutorRequests,

          quizEvaluation,

          recommendations,

          averageLatencyMs:
            Math.round(
              averageLatency
            ),

          successRate:
            Number(
              successRate.toFixed(
                1
              )
            ),
        },

        backgroundJobs: {
          completed:
            completedJobs,

          processing:
            processingJobs,

          failed:
            failedJobs,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    console.error(
      "Admin overview error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not load admin overview.",
      },
      {
        status: 500,
      }
    );
  }
}