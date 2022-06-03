function Arrow({ color }: { color: string }) {
  return (
    <div className="pt-2 mr-2">
      <svg
        width="10"
        height="16"
        viewBox="0 0 10 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          // eslint-disable-next-line max-len
          d="M0.547693 7.37821L7.66835 0.257567C8.01178 -0.0858557 8.56855 -0.0858557 8.91194 0.257567L9.74244 1.08808C10.0853 1.43091 10.0859 1.98655 9.74391 2.33019L4.10066 8.00002L9.74391 13.6698C10.0859 14.0134 10.0853 14.5691 9.74244 14.9119L8.91193 15.7424C8.56851 16.0859 8.01174 16.0859 7.66835 15.7424L0.547693 8.62183C0.204307 8.2784 0.204307 7.72163 0.547693 7.37821Z"
          fill={color}
        />
      </svg>
    </div>
  );
}

export default Arrow;
